import { and, eq, isNull, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { bookingSecrets } from "@/db/operations-schema";
import {
  bookingPricingDetails,
  jobConversations,
  jobMessages,
  jobRequests,
  quoteOffers,
  quotes
} from "@/db/marketplace-schema";
import { bookingEvents, bookings, businesses, conversations, messages, services, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { checkProviderAvailability } from "@/lib/availability";
import { hashServicePin, servicePinForBooking } from "@/lib/booking";
import { POLICY_VERSION } from "@/lib/booking-workflow";
import { sendTransactionalEmail } from "@/lib/email";
import { requireCustomerJob } from "@/lib/job-access";
import { PROVIDER_PLANS } from "@/lib/plans";
import { redeemCreditsForBooking, restoreBookingRewardCredit } from "@/lib/rewards";

const schema = z.object({ useRewards: z.boolean().default(true) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; quoteId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id, quoteId } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid_acceptance" }, { status: 400 });

  let job;
  try { job = await requireCustomerJob(id, user.id); }
  catch { return NextResponse.json({ error: "forbidden" }, { status: 403 }); }
  if (!["open", "quoting"].includes(job.status) || job.awardedQuoteId) {
    return NextResponse.json({ error: "job_already_awarded", bookingId: job.bookingId }, { status: 409 });
  }

  const db = getDb();
  const [row] = await db.select({ quote: quotes, business: businesses })
    .from(quotes)
    .innerJoin(businesses, eq(businesses.id, quotes.businessId))
    .where(and(eq(quotes.id, quoteId), eq(quotes.jobRequestId, job.id)))
    .limit(1);
  if (!row || row.quote.status !== "submitted") return NextResponse.json({ error: "quote_not_ready" }, { status: 409 });
  if (row.quote.validUntil && row.quote.validUntil.getTime() <= Date.now()) return NextResponse.json({ error: "quote_expired" }, { status: 409 });
  if (!row.business.ownerUserId || row.business.status !== "active" || !row.business.stripePayoutsEnabled || !row.business.stripeConnectAccountId) {
    return NextResponse.json({ error: "provider_not_bookable" }, { status: 409 });
  }

  const scheduledEnd = job.scheduledEnd ?? new Date(job.scheduledStart.getTime() + (row.quote.estimatedDurationMinutes ?? 120) * 60_000);
  const availability = await checkProviderAvailability(row.business.id, job.scheduledStart, scheduledEnd);
  if (!availability.available) return NextResponse.json({ error: "provider_no_longer_available", reason: availability.reason }, { status: 409 });

  const [locked] = await db.update(jobRequests).set({
    status: "awarded",
    awardedQuoteId: row.quote.id,
    updatedAt: new Date()
  }).where(and(
    eq(jobRequests.id, job.id),
    eq(jobRequests.customerId, user.id),
    isNull(jobRequests.awardedQuoteId),
    or(eq(jobRequests.status, "open"), eq(jobRequests.status, "quoting"))
  )).returning();
  if (!locked) return NextResponse.json({ error: "job_already_awarded" }, { status: 409 });

  let bookingId: string | null = null;
  try {
    const [service] = await db.select().from(services).where(and(
      eq(services.businessId, row.business.id),
      eq(services.categoryId, job.categoryId),
      eq(services.active, true)
    )).limit(1);
    const commissionBps = PROVIDER_PLANS[row.business.plan].commissionBps;

    const [booking] = await db.insert(bookings).values({
      customerId: user.id,
      businessId: row.business.id,
      serviceId: service?.id,
      status: "accepted",
      scheduledStart: job.scheduledStart,
      scheduledEnd,
      serviceAddress: job.serviceAddress,
      serviceLatitude: job.serviceLatitude,
      serviceLongitude: job.serviceLongitude,
      customerNotes: job.description,
      subtotalCents: row.quote.customerTotalCents,
      marketplaceFeeCents: row.quote.providerCommissionCents,
      providerAmountCents: row.quote.providerPayoutCents,
      currency: row.quote.currency,
      commissionBpsSnapshot: commissionBps
    }).returning();
    bookingId = booking.id;

    const rewardCreditCents = parsed.data.useRewards
      ? await redeemCreditsForBooking(user.id, booking.id, row.quote.customerProtectionFeeCents)
      : 0;
    const chargedTotalCents = row.quote.customerTotalCents - rewardCreditCents;

    await db.update(bookings).set({ subtotalCents: chargedTotalCents, updatedAt: new Date() }).where(eq(bookings.id, booking.id));
    await db.insert(bookingPricingDetails).values({
      bookingId: booking.id,
      jobRequestId: job.id,
      quoteId: row.quote.id,
      serviceSubtotalCents: row.quote.serviceSubtotalCents,
      providerCommissionCents: row.quote.providerCommissionCents,
      customerProtectionFeeCents: row.quote.customerProtectionFeeCents,
      customerTotalBeforeRewardsCents: row.quote.customerTotalCents,
      rewardsCreditCents: rewardCreditCents,
      chargedTotalCents,
      providerPayoutCents: row.quote.providerPayoutCents,
      currency: row.quote.currency
    });

    const pin = servicePinForBooking(booking.id);
    await db.insert(bookingSecrets).values({ bookingId: booking.id, servicePinHash: hashServicePin(pin) });
    await db.insert(bookingEvents).values({
      bookingId: booking.id,
      actorUserId: user.id,
      eventType: "marketplace_quote_awarded",
      nextStatus: "accepted",
      metadata: {
        jobRequestId: job.id,
        quoteId: row.quote.id,
        serviceName: service?.name ?? job.title,
        serviceSubtotalCents: row.quote.serviceSubtotalCents,
        providerCommissionCents: row.quote.providerCommissionCents,
        customerProtectionFeeCents: row.quote.customerProtectionFeeCents,
        rewardsCreditCents: rewardCreditCents,
        chargedTotalCents,
        providerPayoutCents: row.quote.providerPayoutCents,
        policyAccepted: true,
        policyVersion: POLICY_VERSION,
        customerProtectionHours: 24
      }
    });

    const [preConversation] = await db.select().from(jobConversations).where(and(
      eq(jobConversations.jobRequestId, job.id),
      eq(jobConversations.businessId, row.business.id)
    )).limit(1);
    if (preConversation) {
      const [bookingConversation] = await db.insert(conversations).values({ bookingId: booking.id }).returning();
      const preMessages = await db.select().from(jobMessages).where(eq(jobMessages.conversationId, preConversation.id));
      for (const message of preMessages) {
        await db.insert(messages).values({ conversationId: bookingConversation.id, senderUserId: message.senderUserId, body: message.body, createdAt: message.createdAt });
      }
    }

    await db.update(quotes).set({ status: "declined", updatedAt: new Date() }).where(eq(quotes.jobRequestId, job.id));
    await db.update(quotes).set({ status: "accepted", updatedAt: new Date() }).where(eq(quotes.id, row.quote.id));
    await db.update(quoteOffers).set({ status: "accepted" }).where(and(eq(quoteOffers.quoteId, row.quote.id), eq(quoteOffers.status, "pending")));
    await db.update(jobRequests).set({ bookingId: booking.id, updatedAt: new Date() }).where(eq(jobRequests.id, job.id));

    const [providerOwner] = await db.select().from(users).where(eq(users.id, row.business.ownerUserId)).limit(1);
    if (providerOwner) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
      try {
        await sendTransactionalEmail({
          to: providerOwner.email,
          subject: `Your quote was selected: ${job.title}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#13231d"><h1 style="font-size:24px">Your VeroTask quote was selected</h1><p>The customer selected your quote. Your expected payout is <strong>$${(row.quote.providerPayoutCents / 100).toFixed(2)}</strong>.</p><p>Wait for secure payment to change the booking to <strong>Scheduled</strong> before starting the service.</p><p style="margin:28px 0"><a href="${baseUrl}/bookings/${booking.id}" style="background:#126a4b;color:white;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">Open booking</a></p></div>`
        });
      } catch (error) { console.error("[VeroTask quote award notification]", error); }
    }

    return NextResponse.json({
      bookingId: booking.id,
      status: "accepted",
      paymentRequired: true,
      pricing: {
        servicePriceCents: row.quote.serviceSubtotalCents,
        veroProtectionAndServiceFeeCents: row.quote.customerProtectionFeeCents,
        veroRewardsAppliedCents: rewardCreditCents,
        totalToPayCents: chargedTotalCents
      },
      next: `/bookings/${booking.id}`
    });
  } catch (error) {
    if (bookingId) {
      await restoreBookingRewardCredit(bookingId).catch(() => undefined);
      await db.delete(bookings).where(eq(bookings.id, bookingId)).catch(() => undefined);
    }
    await db.update(jobRequests).set({ status: "quoting", awardedQuoteId: null, updatedAt: new Date() })
      .where(and(eq(jobRequests.id, job.id), eq(jobRequests.awardedQuoteId, row.quote.id), isNull(jobRequests.bookingId)));
    console.error("[VeroTask quote acceptance]", error);
    return NextResponse.json({ error: "quote_acceptance_failed" }, { status: 500 });
  }
}
