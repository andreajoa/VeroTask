import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getDb, getTransactionalDb } from "@/db";
import { bookingCheckoutSessions, providerCheckoutSessions } from "@/db/operations-schema";
import { bookingEvents, bookings, businesses, disputes, providerSubscriptions, refunds } from "@/db/schema";
import { sendBookingThankYou, sendProviderPlanThankYou } from "@/lib/crm-automation";
import { refundBookingPayment } from "@/lib/booking-workflow";
import { finalizeDisputeResolutionForRefund } from "@/lib/dispute-workflow";
import { PROVIDER_PLANS, type PlanKey } from "@/lib/plans";
import { getStripe } from "@/lib/stripe";
import { bookingPaymentDisposition, validateBookingPayment } from "@/lib/payment-policy";

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
  await db.insert(providerSubscriptions).values({
    businessId, plan, stripeSubscriptionId: subscription.id, stripePriceId: priceId,
    commissionBps: PROVIDER_PLANS[plan].commissionBps, active,
    cancelAtPeriodEnd: subscription.cancel_at_period_end
  }).onConflictDoUpdate({ target: providerSubscriptions.stripeSubscriptionId, set: {
    plan, stripePriceId: priceId, commissionBps: PROVIDER_PLANS[plan].commissionBps,
    active, cancelAtPeriodEnd: subscription.cancel_at_period_end, updatedAt: new Date()
  } });
  const [currentPlan] = await db.select().from(providerSubscriptions)
    .where(and(eq(providerSubscriptions.businessId, businessId), eq(providerSubscriptions.active, true)))
    .orderBy(desc(providerSubscriptions.createdAt)).limit(1);
  await db.update(businesses).set({ plan: currentPlan?.plan ?? "free", updatedAt: new Date() }).where(eq(businesses.id, businessId));
  if (active) await db.update(providerCheckoutSessions).set({ status: "complete", updatedAt: new Date() }).where(eq(providerCheckoutSessions.businessId, businessId));

  if (active) await safely("provider-plan-thank-you", () => sendProviderPlanThankYou(businessId, subscription.id, plan));
}

async function markBookingPaid(bookingId: string, paymentIntentInput: string | Stripe.PaymentIntent) {
  const stripe = getStripe();
  const paymentIntent = typeof paymentIntentInput === "string"
    ? await stripe.paymentIntents.retrieve(paymentIntentInput, { expand: ["latest_charge"] })
    : paymentIntentInput;
  const latestCharge = paymentIntent.latest_charge;
  const chargeId = typeof latestCharge === "string" ? latestCharge : latestCharge?.id;
  const action = await getTransactionalDb().transaction(async (tx) => {
    const [booking] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).for("update").limit(1);
    if (!booking) return null;
    const invalid = validateBookingPayment(booking, paymentIntent);
    if (invalid) throw new Error(invalid);
    const disposition = bookingPaymentDisposition(booking, paymentIntent.id);

    if (disposition === "already_processed") {
      const [pending] = await tx.select({ id: bookingEvents.id }).from(bookingEvents)
        .where(and(eq(bookingEvents.bookingId, bookingId), eq(bookingEvents.eventType, "payment_requires_refund"))).limit(1);
      const [completed] = await tx.select({ id: bookingEvents.id }).from(bookingEvents)
        .where(and(eq(bookingEvents.bookingId, bookingId), eq(bookingEvents.eventType, "unexpected_booking_fee_refunded"))).limit(1);
      return pending && !completed ? { refund: true, amount: booking.marketplaceFeeCents } : null;
    }

    const shouldSchedule = disposition === "schedule" || disposition === "recover_schedule";
    await tx.update(bookings).set({
      status: shouldSchedule ? "scheduled" : booking.status,
      stripePaymentIntentId: paymentIntent.id,
      stripeChargeId: chargeId ?? booking.stripeChargeId,
      updatedAt: new Date()
    }).where(eq(bookings.id, bookingId));
    await tx.update(bookingCheckoutSessions).set({ status: "complete", updatedAt: new Date() })
      .where(eq(bookingCheckoutSessions.bookingId, bookingId));
    await tx.insert(bookingEvents).values({
      bookingId,
      eventType: shouldSchedule ? "payment_succeeded" : "payment_requires_refund",
      previousStatus: booking.status,
      nextStatus: shouldSchedule ? "scheduled" : booking.status,
      metadata: { paymentIntentId: paymentIntent.id, chargeId: chargeId ?? null }
    });
    return { refund: !shouldSchedule, amount: booking.marketplaceFeeCents };
  });
  if (!action) return;
  if (!action.refund) {
    await safely("booking-thank-you", () => sendBookingThankYou(bookingId));
    return;
  }

  // The refund-required event is committed with the PI so a webhook retry can
  // resume this operation after a network/Stripe failure or interrupted worker.
  const refund = await refundBookingPayment({
    bookingId,
    amountCents: action.amount,
    reason: "booking_fee_paid_after_booking_became_ineligible"
  });
  if (refund.status !== "succeeded") throw new Error("booking_fee_refund_not_completed");

  await getTransactionalDb().transaction(async (tx) => {
    const [current] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).for("update").limit(1);
    if (!current || current.stripePaymentIntentId !== paymentIntent.id) return;
    const [recorded] = await tx.select({ id: bookingEvents.id }).from(bookingEvents)
      .where(and(eq(bookingEvents.bookingId, bookingId), eq(bookingEvents.eventType, "unexpected_booking_fee_refunded"))).limit(1);
    if (recorded) return;
    await tx.update(bookings).set({ status: "refunded", updatedAt: new Date() }).where(eq(bookings.id, bookingId));
    await tx.insert(bookingEvents).values({
      bookingId,
      eventType: "unexpected_booking_fee_refunded",
      previousStatus: current.status,
      nextStatus: "refunded",
      metadata: { paymentIntentId: paymentIntent.id, amountCents: action.amount }
    });
  });
}

async function markCheckoutExpired(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.verotask_booking_id;
  const db = getDb();
  if (!bookingId) {
    await db.update(providerCheckoutSessions).set({ status: "expired", updatedAt: new Date() }).where(and(eq(providerCheckoutSessions.stripeSessionId, session.id), eq(providerCheckoutSessions.status, "open")));
    return;
  }
  const [expired] = await db.update(bookingCheckoutSessions).set({ status: "expired", updatedAt: new Date() })
    .where(and(eq(bookingCheckoutSessions.stripeSessionId, session.id), eq(bookingCheckoutSessions.status, "open"))).returning();
  if (!expired) return;

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking) return;

  if (booking.status === "payment_authorized") {
    const [changed] = await db.update(bookings).set({ status: "accepted", updatedAt: new Date() }).where(and(eq(bookings.id, bookingId), eq(bookings.status, "payment_authorized"), isNull(bookings.stripePaymentIntentId))).returning();
    if (!changed) return;
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
    // Duplicate deliveries race this check-then-insert. Losing the partial
    // unique index is the expected outcome, not a 500 that Stripe keeps retrying.
    }).onConflictDoNothing();
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
      if (bookingId && session.payment_status === "paid" && session.payment_intent) await markBookingPaid(bookingId, session.payment_intent as string | Stripe.PaymentIntent);
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
      // Retrieve current state so delayed webhook deliveries cannot regress a
      // succeeded refund back to processing.
      const refund = await stripe.refunds.retrieve(event.data.object.id);
      const succeeded = refund.status === "succeeded";
      const db = getDb();
      await db.update(refunds).set({
        status: succeeded ? "succeeded" : refund.status === "failed" || refund.status === "canceled" ? "failed" : "processing",
        processedAt: succeeded ? new Date() : undefined
      }).where(succeeded
        ? eq(refunds.stripeRefundId, refund.id)
        // Two deliveries can interleave between retrieve and write, so a
        // non-final state may never overwrite a refund already settled.
        : and(eq(refunds.stripeRefundId, refund.id), ne(refunds.status, "succeeded")));
      // An administrator decides a dispute only once. When that decision waited
      // on an asynchronous refund, this is what finally closes the booking.
      if (succeeded) await finalizeDisputeResolutionForRefund(refund.id);
      break;
    }

    case "charge.dispute.created":
      await recordCardDispute(event.data.object);
      break;

    case "customer.subscription.created":
    case "customer.subscription.updated":
      await upsertProviderSubscription(await stripe.subscriptions.retrieve(event.data.object.id));
      break;

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      await upsertProviderSubscription(subscription);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
