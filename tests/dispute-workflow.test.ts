import assert from "node:assert/strict";
import test from "node:test";
import {
  cancellationPolicy,
  disputeAdminActor,
  disputeAvailabilityError,
  refundCompletionState,
  resolutionValidationError
} from "../src/lib/dispute-workflow";

test("an admin-cookie session may resolve disputes without an app user actor", () => {
  assert.deepEqual(disputeAdminActor(null, true), { allowed: true, actorUserId: null });
});

test("admin and support app users remain authorized actors", () => {
  assert.deepEqual(disputeAdminActor({ id: "admin-1", role: "admin" }, false), { allowed: true, actorUserId: "admin-1" });
  assert.deepEqual(disputeAdminActor({ id: "support-1", role: "support" }, false), { allowed: true, actorUserId: "support-1" });
  assert.deepEqual(disputeAdminActor({ id: "customer-1", role: "customer" }, false), { allowed: false, actorUserId: null });
});

test("dispute timing policy is evaluated from the locked booking snapshot", () => {
  const serviceEnd = new Date("2026-09-20T16:00:00.000Z");
  assert.equal(disputeAvailabilityError({ status: "scheduled", scheduledStart: serviceEnd, scheduledEnd: serviceEnd }, "provider_no_show", new Date("2026-09-20T15:59:59.000Z")), "service_window_not_finished");
  assert.equal(disputeAvailabilityError({ status: "scheduled", scheduledStart: serviceEnd, scheduledEnd: serviceEnd }, "provider_no_show", new Date("2026-09-20T16:00:00.000Z")), null);
  assert.equal(disputeAvailabilityError({ status: "cancelled", scheduledStart: serviceEnd, scheduledEnd: serviceEnd }, "other", serviceEnd), "dispute_not_available");
  assert.equal(disputeAvailabilityError({ status: "paid_out", scheduledStart: serviceEnd, scheduledEnd: serviceEnd }, "other", new Date("2026-09-23T16:00:00.001Z")), "internal_dispute_window_closed");
});

test("resolution policy constrains refunds to the VeroTask booking fee", () => {
  assert.equal(resolutionValidationError({ outcome: "customer", refundCents: 100 }, 100), null);
  assert.equal(resolutionValidationError({ outcome: "provider", refundCents: 0 }, 100), null);
  assert.equal(resolutionValidationError({ outcome: "split", refundCents: 50 }, 100), null);
  assert.equal(resolutionValidationError({ outcome: "customer", refundCents: 101 }, 100), "refund_exceeds_verotask_booking_fee");
  assert.equal(resolutionValidationError({ outcome: "customer", refundCents: 0 }, 100), "customer_outcome_requires_refund");
  assert.equal(resolutionValidationError({ outcome: "provider", refundCents: 1 }, 100), "provider_outcome_requires_zero_refund");
  assert.equal(resolutionValidationError({ outcome: "split", refundCents: 100 }, 100), "split_outcome_requires_partial_booking_fee_refund");
});

test("cancellation policy uses the locked booking time and role", () => {
  const booking = {
    status: "scheduled",
    scheduledStart: new Date("2026-09-22T16:00:00.000Z"),
    marketplaceFeeCents: 1000,
    stripePaymentIntentId: "pi_test"
  };
  assert.deepEqual(cancellationPolicy(booking, "customer", new Date("2026-09-20T15:00:00.000Z")), {
    refundCents: 1000,
    rule: "customer_cancelled_over_24h_booking_fee_refund"
  });
  assert.deepEqual(cancellationPolicy(booking, "customer", new Date("2026-09-22T08:00:00.000Z")), {
    refundCents: 500,
    rule: "customer_cancelled_6_to_24h_half_booking_fee_refund"
  });
  assert.deepEqual(cancellationPolicy(booking, "provider", new Date("2026-09-22T08:00:00.000Z")), {
    refundCents: 1000,
    rule: "provider_cancelled_booking_fee_refund"
  });
});

test("only a succeeded Stripe refund may finalize a refunded booking or dispute", () => {
  assert.equal(refundCompletionState("succeeded"), "succeeded");
  assert.equal(refundCompletionState("pending"), "pending");
  assert.equal(refundCompletionState("requires_action"), "pending");
  assert.equal(refundCompletionState("failed"), "failed");
  assert.equal(refundCompletionState("canceled"), "failed");
});
