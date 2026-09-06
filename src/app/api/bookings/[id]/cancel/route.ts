import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { bookingPricingDetails } from "@/db/marketplace-schema";
import { bookingEvents, bookings } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { bookingAccess } from "@/lib/booking-access";
import { POLICY_VERSION, refundBookingPayment, releaseProviderTransfer } from "@/lib/booking-workflow";
import { restoreBookingRewardCredit } from "@/lib/rewards";

const schema = z.object({ reason: z.string().trim().min(3).max(1000) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_cancellation" }, { status: 400 });

  const access = await bookingAccess(id, user.id);
  if (!access?.allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!["requested", "accepted", "payment_authorized", "scheduled"].includes(access.booking.status)) {
    return NextResponse.json({ error: "booking_cannot_be_cancelled" }, { status: 409 });
  }

  const db = getDb();
  const [pricing] = await db.select().from(bookingPricingDetails).where(eq(bookingPricingDetails.bookingId, id)).limit(1);
  const paymentCaptured = Boolean(access.booking.stripePaymentIntentId);
  const servicePriceCents = pricing?.serviceSubtotalCents ?? access.booking.subtotalCents;
  const paidProtectionFeeCents = pricing
    ? Math.max(0, pricing.customerProtectionFeeCents - pricing.rewardsCreditCents)
    : 0;
  let refundCents = 0;
  let providerCompensationCents = 0;
  let restoreRewards = !paymentCaptured;
  let rule = "unpaid_cancellation";

  if (access.isProvider) {
    refundCents = paymentCaptured ? access.booking.subtotalCents : 0;
    restoreRewards = true;
    rule = paymentCaptured ? "provider_cancelled_full_refund" : "provider_cancelled_before_payment";
  } else if (paymentCaptured) {
    const hoursUntilStart = (access.booking.scheduledStart.getTime() - Date.now()) / 3_600_000;
    if (hoursUntilStart > 24) {
      refundCents = access.booking.subtotalCents;
      restoreRewards = true;
      rule = "customer_cancelled_over_24h_full_refund";
    } else if (hoursUntilStart >= 6) {
      if (pricing) {
        const refundableServiceCents = Math.round(servicePriceCents * 0.5);
        refundCents = Math.min(access.booking.subtotalCents, refundableServiceCents + paidProtectionFeeCents);
        const retainedServiceCents = servicePriceCents - refundableServiceCents;
        providerCompensationCents = Math.round(retainedServiceCents * (10_000 - access.booking.commissionBpsSnapshot) / 10_000);
        restoreRewards = true;
      } else {
        refundCents = Math.round(access.booking.subtotalCents * 0.5);
        const retainedGross = access.booking.subtotalCents - refundCents;
        providerCompensationCents = Math.round(retainedGross * (10_000 - access.booking.commissionBpsSnapshot) / 10_000);
      }
      rule = "customer_cancelled_6_to_24h_half_service_charge";
    } else {
      if (pricing) {
        refundCents = Math.min(access.booking.subtotalCents, paidProtectionFeeCents);
        providerCompensationCents = pricing.providerPayoutCents;
        restoreRewards = true;
      } else {
        providerCompensationCents = access.booking.providerAmountCents;
      }
      rule = "customer_cancelled_under_6h_service_nonrefundable";
    }
  } else if (access.booking.status === "accepted" || access.booking.status === "payment_authorized") {
    restoreRewards = true;
    rule = "customer_cancelled_before_payment";
  }

  if (refundCents > 0) {
    await refundBookingPayment({ bookingId: id, amountCents: refundCents, reason: rule });
  }
  const rewardsRestoredCents = restoreRewards ? await restoreBookingRewardCredit(id) : 0;

  const nextStatus = refundCents === access.booking.subtotalCents ? "refunded" : "cancelled";
  await db.update(bookings).set({ status: nextStatus, updatedAt: new Date() }).where(eq(bookings.id, id));
  await db.insert(bookingEvents).values({
    bookingId: id,
    actorUserId: user.id,
    eventType: "booking_cancelled",
    previousStatus: access.booking.status,
    nextStatus,
    metadata: {
      cancelledBy: access.isProvider ? "provider" : "customer",
      reason: parsed.data.reason,
      policyRule: rule,
      policyVersion: POLICY_VERSION,
      servicePriceCents,
      paidProtectionFeeCents,
      refundCents,
      rewardsRestoredCents,
      providerCompensationCents
    }
  });

  if (providerCompensationCents > 0 && access.isCustomer) {
    try { await releaseProviderTransfer(id, providerCompensationCents); }
    catch { /* payout retry is handled by scheduled settlement */ }
  }

  return NextResponse.json({
    ok: true,
    status: nextStatus,
    refundCents,
    rewardsRestoredCents,
    providerCompensationCents,
    policyRule: rule
  });
}