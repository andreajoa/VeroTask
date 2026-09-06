import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { bookingPricingDetails, jobRequests } from "@/db/marketplace-schema";
import { bookingCheckoutSessions } from "@/db/operations-schema";
import { bookingEvents, bookings, services, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { requireCustomerBooking } from "@/lib/booking-access";
import { POLICY_VERSION } from "@/lib/booking-workflow";
import { getStripe } from "@/lib/stripe";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  let access;
  try { access = await requireCustomerBooking(id, user.id); }
  catch { return NextResponse.json({ error: "forbidden" }, { status: 403 }); }

  if (!["accepted", "payment_authorized"].includes(access.booking.status)) {
    return NextResponse.json({ error: "provider_acceptance_required" }, { status: 409 });
  }
  if (access.booking.scheduledStart.getTime() <= Date.now()) {
    return NextResponse.json({ error: "booking_time_expired" }, { status: 409 });
  }
  if (!access.business.stripeConnectAccountId || !access.business.stripePayoutsEnabled) {
    return NextResponse.json({ error: "provider_payout_not_ready" }, { status: 409 });
  }

  const db = getDb();
  const stripe = getStripe();
  const [existing] = await db.select().from(bookingCheckoutSessions)
    .where(eq(bookingCheckoutSessions.bookingId, id)).limit(1);

  if (existing && existing.status === "open" && existing.expiresAt.getTime() > Date.now()) {
    try {
      const session = await stripe.checkout.sessions.retrieve(existing.stripeSessionId);
      if (session.status === "open" && session.client_secret) {
        return NextResponse.json({ bookingId: id, clientSecret: session.client_secret, resumed: true });
      }
    } catch {
      // A stale Stripe session is replaced below.
    }
    await db.update(bookingCheckoutSessions).set({ status: "expired", updatedAt: new Date() })
      .where(eq(bookingCheckoutSessions.id, existing.id));
  }

  const [service, pricing] = await Promise.all([
    access.booking.serviceId
      ? db.select().from(services).where(eq(services.id, access.booking.serviceId)).limit(1).then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
    db.select().from(bookingPricingDetails).where(eq(bookingPricingDetails.bookingId, id)).limit(1).then((rows) => rows[0] ?? null)
  ]);
  const job = pricing?.jobRequestId
    ? await db.select().from(jobRequests).where(eq(jobRequests.id, pricing.jobRequestId)).limit(1).then((rows) => rows[0] ?? null)
    : null;
  const serviceName = service?.name ?? job?.title ?? "VeroTask local service";

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { verotask_user_id: user.id }
    });
    customerId = customer.id;
    await db.update(users).set({ stripeCustomerId: customerId, updatedAt: new Date() }).where(eq(users.id, user.id));
  }

  const lineItems = pricing ? [
    {
      quantity: 1,
      price_data: {
        currency: access.booking.currency,
        unit_amount: pricing.serviceSubtotalCents,
        product_data: {
          name: serviceName,
          description: `${access.business.name} · ${access.business.city}, ${access.business.state}`
        }
      }
    },
    ...(pricing.customerProtectionFeeCents - pricing.rewardsCreditCents > 0 ? [{
      quantity: 1,
      price_data: {
        currency: access.booking.currency,
        unit_amount: pricing.customerProtectionFeeCents - pricing.rewardsCreditCents,
        product_data: {
          name: "Vero Protection & Service Fee",
          description: pricing.rewardsCreditCents > 0
            ? `Vero Protect support and booking protection · $${(pricing.rewardsCreditCents / 100).toFixed(2)} Vero Rewards applied`
            : "Vero Protect support, payment records and dispute workflow"
        }
      }
    }] : [])
  ] : [{
    quantity: 1,
    price_data: {
      currency: access.booking.currency,
      unit_amount: access.booking.subtotalCents,
      product_data: {
        name: serviceName,
        description: `${access.business.name} · ${access.business.city}, ${access.business.state}`
      }
    }
  }];

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    mode: "payment",
    customer: customerId,
    line_items: lineItems,
    payment_intent_data: {
      transfer_group: `verotask_booking_${id}`,
      metadata: {
        verotask_booking_id: id,
        verotask_business_id: access.business.id,
        verotask_policy_version: POLICY_VERSION,
        verotask_protected_booking: "true"
      }
    },
    metadata: {
      verotask_booking_id: id,
      verotask_business_id: access.business.id,
      verotask_service_id: service?.id ?? "",
      verotask_job_request_id: pricing?.jobRequestId ?? "",
      verotask_policy_version: POLICY_VERSION
    },
    return_url: `${baseUrl}/bookings/${id}?checkout=return&session_id={CHECKOUT_SESSION_ID}`
  });

  if (!session.client_secret) return NextResponse.json({ error: "checkout_unavailable" }, { status: 500 });
  const expiresAt = new Date(session.expires_at * 1000);

  await db.insert(bookingCheckoutSessions).values({
    bookingId: id,
    stripeSessionId: session.id,
    status: "open",
    expiresAt,
    updatedAt: new Date()
  }).onConflictDoUpdate({
    target: bookingCheckoutSessions.bookingId,
    set: { stripeSessionId: session.id, status: "open", expiresAt, updatedAt: new Date() }
  });

  if (access.booking.status === "accepted") {
    await db.update(bookings).set({ status: "payment_authorized", updatedAt: new Date() }).where(eq(bookings.id, id));
    await db.insert(bookingEvents).values({
      bookingId: id,
      actorUserId: user.id,
      eventType: "checkout_started",
      previousStatus: "accepted",
      nextStatus: "payment_authorized",
      metadata: {
        stripeCheckoutSessionId: session.id,
        expiresAt: expiresAt.toISOString(),
        serviceSubtotalCents: pricing?.serviceSubtotalCents ?? access.booking.subtotalCents,
        veroProtectionFeeCents: pricing?.customerProtectionFeeCents ?? 0,
        veroRewardsAppliedCents: pricing?.rewardsCreditCents ?? 0,
        chargedTotalCents: access.booking.subtotalCents
      }
    });
  }

  return NextResponse.json({ bookingId: id, clientSecret: session.client_secret, resumed: false });
}