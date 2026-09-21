import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sql, eq, and } from "drizzle-orm";
import { NextRequest } from "next/server";
import Stripe from "stripe";
import { getTransactionalDb } from "../src/db";
import { bookings, users, businesses, refunds, bookingEvents, disputes } from "../src/db/schema";
import { getStripe } from "../src/lib/stripe";
import { POST } from "../src/app/api/stripe/webhook/route";
import { adminLoginRiskKey, consumeAdminLoginAttempt } from "../src/lib/admin-auth";
import { adminLoginAttempts } from "../src/db/analytics-schema";
import { resolveBookingDispute } from "../src/lib/dispute-workflow";

async function main() {
  if (process.env.VEROTASK_INTEGRATION_TEST !== "isolated") throw new Error("Explicit isolated test opt-in required");
  process.env.DATABASE_DRIVER = "postgres";
  process.env.STRIPE_SECRET_KEY = "sk_test_mock_no_network";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_isolated_recovery_test";
  const db = getTransactionalDb();
  const guard = await db.execute(sql`select to_regclass('public.verotask_verification_environment') as guard`);
  assert(guard.rows[0]?.guard, "Isolated verification branch guard required");
  const suffix = randomUUID();
  const riskKey = adminLoginRiskKey(`isolated-${suffix}`);
  try {
    const attempts = await Promise.all(Array.from({ length: 8 }, () => consumeAdminLoginAttempt(riskKey)));
    assert.equal(attempts.filter(attempt => attempt.allowed).length, 5, "Only five concurrent login attempts may reach password verification");
    assert.equal((await consumeAdminLoginAttempt(riskKey)).allowed, false);
    console.log("PASS durable admin throttle limits concurrent attempts and does not depend on browser cookies");
  } finally {
    await db.delete(adminLoginAttempts).where(eq(adminLoginAttempts.keyHash, riskKey));
  }
  const [customer] = await db.insert(users).values({ email: `recovery-${suffix}@verotask.invalid` }).returning();
  const [business] = await db.insert(businesses).values({ name: "Isolated payment recovery fixture", slug: suffix, city: "Orlando", active: false }).returning();
  const [booking] = await db.insert(bookings).values({ customerId: customer.id, businessId: business.id, status: "cancelled", scheduledStart: new Date(), serviceAddress: "Isolated fixture", subtotalCents: 10000, marketplaceFeeCents: 1500, providerAmountCents: 10000, commissionBpsSnapshot: 0 }).returning();
  const stripe = getStripe();
  let calls = 0;
  const succeeded = { id: `re_${suffix}`, status: "succeeded", amount: 1500 } as Stripe.Refund;
  stripe.refunds.create = (async () => {
    calls++;
    if (calls === 1) throw new Error("simulated_network_interruption");
    return succeeded;
  }) as unknown as typeof stripe.refunds.create;
  stripe.refunds.retrieve = (async () => succeeded) as unknown as typeof stripe.refunds.retrieve;
  const payment = { id: `pi_${suffix}`, object: "payment_intent", status: "succeeded", amount_received: 1500, currency: "usd", latest_charge: `ch_${suffix}`, metadata: { verotask_booking_id: booking.id, verotask_business_id: business.id } };
  async function deliverEvent(type: string, object: unknown) {
    const payload = JSON.stringify({ id: `evt_${randomUUID()}`, object: "event", type, data: { object } });
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET! });
    return POST(new NextRequest("http://127.0.0.1/api/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": signature } }));
  }
  const deliver = () => deliverEvent("payment_intent.succeeded", payment);
  try {
    await assert.rejects(deliver, /simulated_network_interruption/);
    const [interrupted] = await db.select().from(bookings).where(eq(bookings.id, booking.id));
    assert.equal(interrupted.stripePaymentIntentId, payment.id);
    assert.equal(interrupted.status, "cancelled");
    assert.equal((await deliver()).status, 200);
    assert.equal((await deliver()).status, 200);
    const [recovered] = await db.select().from(bookings).where(eq(bookings.id, booking.id));
    assert.equal(recovered.status, "refunded");
    assert.equal(calls, 2, "One failed attempt and one successful refund, no duplicate after replay");
    const records = await db.select().from(refunds).where(eq(refunds.bookingId, booking.id));
    assert.equal(records.length, 1);
    const events = await db.select().from(bookingEvents).where(and(eq(bookingEvents.bookingId, booking.id), eq(bookingEvents.eventType, "unexpected_booking_fee_refunded")));
    assert.equal(events.length, 1);
    console.log("PASS signed webhook recovers interrupted refund exactly once against isolated PostgreSQL");

    await db.update(bookings).set({ status: "disputed" }).where(eq(bookings.id, booking.id));
    // Reuse the isolated fixture after clearing its completed refund operation.
    await db.delete(refunds).where(eq(refunds.bookingId, booking.id));
    const [dispute] = await db.insert(disputes).values({ bookingId: booking.id, openedByUserId: customer.id, reason: "other", summary: "Isolated pending refund resolution test" }).returning();
    const pending = { ...succeeded, status: "pending" } as Stripe.Refund;
    stripe.refunds.create = (async () => pending) as unknown as typeof stripe.refunds.create;
    stripe.refunds.retrieve = (async () => pending) as unknown as typeof stripe.refunds.retrieve;
    const resolution = { disputeId: dispute.id, actorUserId: null, outcome: "customer" as const, refundCents: 1500, note: "Isolated administrative refund review" };
    const waiting = await resolveBookingDispute(resolution);
    assert.equal(waiting.ok, false);
    assert.equal("error" in waiting ? waiting.error : "", "refund_pending");
    const changed = await resolveBookingDispute({ ...resolution, outcome: "provider", refundCents: 0 });
    assert.equal("error" in changed ? changed.error : "", "refund_request_conflict");
    const [stillOpen] = await db.select().from(disputes).where(eq(disputes.id, dispute.id));
    assert.equal(stillOpen.resolvedAt, null);
    stripe.refunds.retrieve = (async () => succeeded) as unknown as typeof stripe.refunds.retrieve;
    assert.equal((await resolveBookingDispute(resolution)).ok, true);
    console.log("PASS pending refund keeps dispute open, rejects changed resolution, and closes only after Stripe success");

    // An administrator decides a dispute once. If the refund only confirms
    // later, the booking must finish on its own instead of staying disputed.
    await db.delete(refunds).where(eq(refunds.bookingId, booking.id));
    await db.update(bookings).set({ status: "disputed" }).where(eq(bookings.id, booking.id));
    const [asyncDispute] = await db.insert(disputes).values({ bookingId: booking.id, openedByUserId: customer.id, reason: "other", summary: "Isolated asynchronous refund completion test" }).returning();
    const asyncRefund = { id: `re_async_${suffix}`, status: "pending", amount: 1500 } as Stripe.Refund;
    stripe.refunds.create = (async () => asyncRefund) as unknown as typeof stripe.refunds.create;
    stripe.refunds.retrieve = (async () => asyncRefund) as unknown as typeof stripe.refunds.retrieve;
    const asyncWaiting = await resolveBookingDispute({ disputeId: asyncDispute.id, actorUserId: null, outcome: "customer", refundCents: 1500, note: "Isolated asynchronous resolution" });
    assert.equal("error" in asyncWaiting ? asyncWaiting.error : "", "refund_pending");
    stripe.refunds.retrieve = (async () => ({ ...asyncRefund, status: "succeeded" })) as unknown as typeof stripe.refunds.retrieve;
    assert.equal((await deliverEvent("refund.updated", { id: asyncRefund.id })).status, 200);
    assert.equal((await deliverEvent("refund.updated", { id: asyncRefund.id })).status, 200);
    const [closedDispute] = await db.select().from(disputes).where(eq(disputes.id, asyncDispute.id));
    assert.notEqual(closedDispute.resolvedAt, null, "Confirmed refund must close the dispute with no second decision");
    assert.equal(closedDispute.resolutionNote, "Isolated asynchronous resolution");
    const [settled] = await db.select().from(bookings).where(eq(bookings.id, booking.id));
    assert.equal(settled.status, "refunded");
    const resolvedEvents = await db.select().from(bookingEvents).where(and(eq(bookingEvents.bookingId, booking.id), eq(bookingEvents.eventType, "dispute_resolved")));
    assert.equal(resolvedEvents.length, 2, "A replayed refund webhook must not resolve the same dispute twice");
    console.log("PASS confirmed refund webhook closes a dispute left pending, and a replay does not repeat it");

    // A refund Stripe reports as failed never reached the customer. Without a
    // fresh attempt their money would be unreturnable through the product.
    await db.delete(refunds).where(eq(refunds.bookingId, booking.id));
    await db.update(bookings).set({ status: "disputed" }).where(eq(bookings.id, booking.id));
    const [retryDispute] = await db.insert(disputes).values({ bookingId: booking.id, openedByUserId: customer.id, reason: "other", summary: "Isolated failed refund retry test" }).returning();
    const failedRefund = { id: `re_failed_${suffix}`, status: "failed", amount: 1500 } as Stripe.Refund;
    const replacementRefund = { id: `re_retry_${suffix}`, status: "succeeded", amount: 1500 } as Stripe.Refund;
    const idempotencyKeys: string[] = [];
    stripe.refunds.create = (async (_params: unknown, options: { idempotencyKey: string }) => {
      idempotencyKeys.push(options.idempotencyKey);
      return idempotencyKeys.length === 1 ? failedRefund : replacementRefund;
    }) as unknown as typeof stripe.refunds.create;
    stripe.refunds.retrieve = (async (id: string) => (id === failedRefund.id ? failedRefund : replacementRefund)) as unknown as typeof stripe.refunds.retrieve;
    const retryInput = { disputeId: retryDispute.id, actorUserId: null, outcome: "customer" as const, refundCents: 1500, note: "Isolated failed refund retry" };
    const firstAttempt = await resolveBookingDispute(retryInput);
    assert.equal("error" in firstAttempt ? firstAttempt.error : "", "refund_failed_requires_review");
    const secondAttempt = await resolveBookingDispute(retryInput);
    assert.equal(secondAttempt.ok, true, "A Stripe-confirmed failure must allow a fresh refund attempt");
    assert.equal(idempotencyKeys.length, 2);
    assert.notEqual(idempotencyKeys[0], idempotencyKeys[1], "A retry after failure needs its own Stripe idempotency key");
    const retryRows = await db.select().from(refunds).where(eq(refunds.disputeId, retryDispute.id));
    assert.equal(retryRows.length, 2, "The failed attempt stays on the record next to its replacement");
    assert.equal(retryRows.filter(row => row.status === "succeeded").length, 1);
    console.log("PASS failed refund is retried under a new Stripe key and only then closes the dispute");

    // A booking fee can only be returned once. A second dispute asking for more
    // than what is left must be told the limit, not fail as a service outage.
    await db.delete(refunds).where(eq(refunds.bookingId, booking.id));
    await db.delete(disputes).where(eq(disputes.bookingId, booking.id));
    await db.update(bookings).set({ status: "disputed" }).where(eq(bookings.id, booking.id));
    const partialRefund = { id: `re_partial_${suffix}`, status: "succeeded", amount: 500 } as Stripe.Refund;
    stripe.refunds.create = (async () => partialRefund) as unknown as typeof stripe.refunds.create;
    stripe.refunds.retrieve = (async () => partialRefund) as unknown as typeof stripe.refunds.retrieve;
    const [firstDispute] = await db.insert(disputes).values({ bookingId: booking.id, openedByUserId: customer.id, reason: "other", summary: "Isolated partial booking fee refund" }).returning();
    assert.equal((await resolveBookingDispute({ disputeId: firstDispute.id, actorUserId: null, outcome: "split", refundCents: 500, note: "Isolated partial refund of the booking fee" })).ok, true);
    const [secondDispute] = await db.insert(disputes).values({ bookingId: booking.id, openedByUserId: customer.id, reason: "other", summary: "Isolated remaining booking fee refund" }).returning();
    const overdrawn = await resolveBookingDispute({ disputeId: secondDispute.id, actorUserId: null, outcome: "customer", refundCents: 1500, note: "Isolated attempt to refund the full fee twice" });
    assert.equal("error" in overdrawn ? overdrawn.error : "", "refund_exceeds_verotask_booking_fee");
    const remainderRefund = { id: `re_remainder_${suffix}`, status: "succeeded", amount: 1000 } as Stripe.Refund;
    stripe.refunds.create = (async () => remainderRefund) as unknown as typeof stripe.refunds.create;
    stripe.refunds.retrieve = (async (id: string) => (id === partialRefund.id ? partialRefund : remainderRefund)) as unknown as typeof stripe.refunds.retrieve;
    assert.equal((await resolveBookingDispute({ disputeId: secondDispute.id, actorUserId: null, outcome: "customer", refundCents: 1000, note: "Isolated refund of what is still owed" })).ok, true);
    const settledRows = await db.select().from(refunds).where(eq(refunds.bookingId, booking.id));
    assert.equal(settledRows.reduce((total, row) => total + row.amountCents, 0), 1500, "The booking fee can never be refunded beyond what was charged");
    console.log("PASS a second dispute is limited to the unrefunded remainder of the booking fee");
  } finally {
    // Only IDs generated by this test in the guarded verification branch.
    await db.delete(refunds).where(eq(refunds.bookingId, booking.id));
    await db.delete(disputes).where(eq(disputes.bookingId, booking.id));
    await db.delete(bookingEvents).where(eq(bookingEvents.bookingId, booking.id));
    await db.delete(bookings).where(eq(bookings.id, booking.id));
    await db.delete(businesses).where(eq(businesses.id, business.id));
    await db.delete(users).where(eq(users.id, customer.id));
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Integration failed"); process.exitCode = 1; });
