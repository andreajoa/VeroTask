import test from "node:test";
import assert from "node:assert/strict";
import { canReleasePayment, canSchedulePaidBooking, validateBookingPayment } from "../src/lib/payment-policy";

const booking = { id: "booking-1", businessId: "business-1", marketplaceFeeCents: 1500, currency: "usd", stripePaymentIntentId: null as string | null };
const payment = { id: "pi_1", status: "succeeded", amount_received: 1500, currency: "usd", metadata: { verotask_booking_id: "booking-1", verotask_business_id: "business-1" } };

test("only a captured VeroTask booking-fee payment matching the booking can fulfill it", () => {
  assert.equal(validateBookingPayment(booking, payment), null);
  assert.equal(validateBookingPayment(booking, { ...payment, status: "processing" }), "payment_not_succeeded");
  assert.equal(validateBookingPayment(booking, { ...payment, amount_received: 10_000 }), "payment_amount_mismatch");
  assert.equal(validateBookingPayment(booking, { ...payment, amount_received: 1499 }), "payment_amount_mismatch");
  assert.equal(validateBookingPayment(booking, { ...payment, currency: "brl" }), "payment_amount_mismatch");
  assert.equal(validateBookingPayment(booking, { ...payment, metadata: { ...payment.metadata, verotask_business_id: "another" } }), "payment_booking_mismatch");
});

test("duplicate events are allowed but a second payment intent is flagged", () => {
  assert.equal(validateBookingPayment({ ...booking, stripePaymentIntentId: "pi_1" }, payment), null);
  assert.equal(validateBookingPayment({ ...booking, stripePaymentIntentId: "pi_other" }, payment), "duplicate_booking_payment");
});

test("late or unaccepted payments never reopen a booking", () => {
  for (const status of ["requested", "cancelled", "refunded", "disputed", "paid_out", "in_progress"]) assert.equal(canSchedulePaidBooking(status), false, status);
  for (const status of ["accepted", "payment_authorized"]) assert.equal(canSchedulePaidBooking(status), true, status);
});

test("legacy completion helper remains compatible without defining the payment model", () => {
  for (const status of ["requested", "accepted", "payment_authorized", "scheduled", "provider_completed", "disputed", "refunded"]) assert.equal(canReleasePayment(status, true), false, status);
  assert.equal(canReleasePayment("customer_confirmed"), true);
  assert.equal(canReleasePayment("auto_completed"), true);
  assert.equal(canReleasePayment("cancelled"), false);
  assert.equal(canReleasePayment("cancelled", true), true);
});
