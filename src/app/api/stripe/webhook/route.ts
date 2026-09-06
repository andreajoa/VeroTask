import { and, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getDb } from "@/db";
import { bookingCheckoutSessions } from "@/db/operations-schema";
import { bookingEvents, bookings, businesses, disputes, providerSubscriptions, refunds } from "@/db/schema";
import { sendBookingThankYou, sendProviderPlanThankYou } from "@/lib/crm-automation";
import { PROVIDER_PLANS, type PlanKey } from "@/lib/plans";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

async function safely(label: string, fn: () => Promise<unknown>) {
  try { await fn(); } catch (error) { console.error(`[VeroTask webhook side effect: ${label}]`, error); }
}

async function upsertProviderSubscription(subscription: Stripe.Subscription) {
  const businessId = subscription.metadata?.verotask_business_id;
  const plan = subscription.metadata?.verotask_plan as PlanKey | undefined;
  if (!businessId || !plan || !PROVIDER_PLANS[plan]) return;

  const db = getDb();
  const active = subscription.status === "active" || subscription.status === "trialing";
  const priceId = subscription.items.data[0]?.price?.id;
  const [existing] = await db.select().from(providerSubscriptions)
    .where(eq(providerSubscriptions.stripeSubscriptionId, subscription.id))
    .limit(1);

  if (existing) {
    await db.update(providerSubscriptions).set({
      plan,
      stripePriceId: priceId,
      commissionBps: PROVIDER_PLANS[plan].commissionBps,
      active,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: new Date()
    }).where(eq(providerSubscriptions.id, existing.id));
  } else {
    await db.insert(providerSubscriptions).values({
      businessId,
      plan,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      commissionBps: PROVIDER_PLANS[plan].commissionBps,
      active,
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    });
  }

  await db.update(businesses).set({ plan: active ? plan : "free", updatedAt: new Date() }).where(eq(businesses.id, businessId));
  if (active) await safely("provider-plan-thank-you", () => sendProviderPlanThankYou(businessId, subscription.id, plan));
}

async function markBookingPaid(bookingId: string, paymentIntentInput: string | Stripe.PaymentIntent) {
  const stripe = getStripe();
  const paymentIntent = typeof paymentIntentInput === "string"
    ? await stripe.paymentIntents.retrieve(paymentIntentInput, { expand: ["latest_charge"] })
    : paymentIntentInput;
  const latestCharge = paymentIntent.latest_charge;
  const chargeId = typeof latestCharge === "string" ? latestCharge : latestCharge?.id;
  const db = getDb();
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking) return;

  const shouldSchedule = ["accepted", "payment_authorized", "requested"].includes(booking.status);
  await db.update(bookings).set({
    status: shouldSchedule ? "scheduled" : booking.status,
    stripePaymentIntentId: paymentIntent.id,
    stripeChargeId: chargeId ?? booking.stripeChargeId,
    updatedAt: new Date()
  }).where(eq(bookings.id, bookingId));
  await db.update(bookingCheckoutSessions).set({ status: "complete", updatedAt: new Date() })
    .where(eq(bookingCheckoutSessions.bookingId, bookingId));

  if (shouldSchedule) {
    await db.insert(bookingEvents).values({
      bookingId,
      eventType: "payment_succeeded",
      previousStatus: booking.status,
      nextStatus: "scheduled",
      metadata: { paymentIntentId: paymentIntent.id, chargeId: chargeId ?? null }
    });
  }
  await safely("booking-thank-you", () => sendBookingThankYou(bookingId));
}

async function markCheckoutExpired(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.verotask_booking_id;
  if (!bookingId) return;
  const db = getDb();
  await db.update(bookingCheckoutSessions).set({ status: "expired", updatedAt: new Date() })
    .where(eq(bookingCheckoutSessions.stripeSessionId, session.id));

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking) return;

  if (booking.status === "payment_authorized") {
    await db.update(bookings).set({ status: "accepted", updatedAt: new Date() }).where(eq(bookings.id, bookingId));
    await db.insert(bookingEvents).values({
      bookingId,
      eventType: "checkout_expired",
      previousStatus: "payment_authorized",
      nextStatus: "accepted",
      metadata: { stripeCheckoutSessionId: session.id }
    });
    return;
  }

  // Compatibility for requests created by the older immediate-checkout flow.
  if (booking.status === "requested") {
    await db.update(bookings).set({ status: "cancelled", updatedAt: new Date() }).where(eq(bookings.id, bookingId));
    await db.insert(bookingEvents).values({
      bookingId,
      eventType: "legacy_checkout_expired",
      previousStatus: "requested",
      nextStatus: "cancelled",
      metadata: { stripeCheckoutSessionId: session.id }
    });
  }
}

async function recordCardDispute(chargeDispute: Stripe.Dispute) {
  const charge = await getStripe().charges.retrieve(typeof chargeDispute.charge === "string" ? chargeDispute.charge : chargeDispute.charge.id);
  const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId) return;

  const db = getDb();
  const [booking] = await db.select().from(bookings).where(eq(bookings.stripePaymentIntentId, paymentIntentId)).limit(1);
  if (!booking) return;

  const [existing] = await db.select({ id: disputes.id }).from(disputes)
    .where(and(eq(disputes.bookingId, booking.id), isNull(disputes.resolvedAt))).limit(1);
  if (!existing) {
    await db.insert(disputes).values({
      bookingId: booking.id,
      openedByUserId: booking.customerId,
      reason: "payment_issue",
      summary: `Card-network dispute opened in Stripe (${chargeDispute.reason ?? "unspecified reason"}).`,
      status: "under_review"
    });
  }
  await db.update(bookings).set({ status: "disputed", updatedAt: new Date() }).where(eq(bookings.id, booking.id));
  await db.insert(bookingEvents).values({
    bookingId: booking.id,
    eventType: "stripe_dispute_created",
    previousStatus: booking.status,
    nextStatus: "disputed",
    metadata: { stripeDisputeId: chargeDispute.id, reason: chargeDispute.reason, amount: chargeDispute.amount }
  });
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: "webhook_not_configured" }, { status: 400 });

  const stripe = getStripe();
  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      const bookingId = session.metadata?.verotask_booking_id;
      if (bookingId && session.payment_intent) await markBookingPaid(bookingId, session.payment_intent as string | Stripe.PaymentIntent);
      break;
    }
    case "checkout.session.expired":
      await markCheckoutExpired(event.data.object);
      break;

    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object;
      const bookingId = paymentIntent.metadata?.verotask_booking_id;
      if (bookingId) await markBookingPaid(bookingId, paymentIntent);
      break;
    }

    case "refund.updated": {
      const refund = event.data.object;
      const db = getDb();
      await db.update(refunds).set({
        status: refund.status === "succeeded" ? "succeeded" : refund.status === "failed" ? "failed" : "processing",
        processedAt: refund.status === "succeeded" ? new Date() : undefined
      }).where(eq(refunds.stripeRefundId, refund.id));
      break;
    }

    case "charge.dispute.created":
      await recordCardDispute(event.data.object);
      break;

    case "customer.subscription.created":
    case "customer.subscription.updated":
      await upsertProviderSubscription(event.data.object);
      break;

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const businessId = subscription.metadata?.verotask_business_id;
      if (!businessId) break;
      const db = getDb();
      await db.update(businesses).set({ plan: "free", updatedAt: new Date() }).where(eq(businesses.id, businessId));
      await db.update(providerSubscriptions).set({ active: false, updatedAt: new Date() }).where(eq(providerSubscriptions.stripeSubscriptionId, subscription.id));
      break;
    }
  }

  return NextResponse.json({ received: true });
}
