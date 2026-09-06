import assert from "node:assert/strict";
import test from "node:test";
import {
  canCustomerStartPayment,
  canProviderAccept,
  canProviderDeclineBeforePayment,
  checkoutExpiryNextStatus,
  isScheduleBlockingStatus
} from "../src/lib/booking-state";

test("provider decides before customer payment", () => {
  assert.equal(canProviderAccept("requested"), true);
  assert.equal(canProviderAccept("accepted"), false);
  assert.equal(canCustomerStartPayment("requested"), false);
  assert.equal(canCustomerStartPayment("accepted"), true);
  assert.equal(canCustomerStartPayment("payment_authorized"), true);
});

test("provider may decline only before payment", () => {
  assert.equal(canProviderDeclineBeforePayment("requested"), true);
  assert.equal(canProviderDeclineBeforePayment("accepted"), true);
  assert.equal(canProviderDeclineBeforePayment("scheduled"), false);
});

test("accepted jobs reserve provider schedule while unaccepted requests do not", () => {
  assert.equal(isScheduleBlockingStatus("requested"), false);
  assert.equal(isScheduleBlockingStatus("accepted"), true);
  assert.equal(isScheduleBlockingStatus("scheduled"), true);
  assert.equal(isScheduleBlockingStatus("cancelled"), false);
});

test("expired payment returns accepted booking to payment-ready state", () => {
  assert.equal(checkoutExpiryNextStatus("payment_authorized"), "accepted");
  assert.equal(checkoutExpiryNextStatus("requested"), "cancelled");
  assert.equal(checkoutExpiryNextStatus("scheduled"), null);
});
