import assert from "node:assert/strict";
import test from "node:test";
import { bookingEmailStillRelevant, transactionalEmailRetryDelayMs } from "../src/lib/transactional-email-outbox";
import { retryableMagicLinkSlot } from "../src/lib/auth";

test("transactional email retries back off and cap at six hours", () => {
  assert.equal(transactionalEmailRetryDelayMs(1), 30_000);
  assert.equal(transactionalEmailRetryDelayMs(2), 60_000);
  assert.equal(transactionalEmailRetryDelayMs(9), 128 * 60 * 1000);
  assert.equal(transactionalEmailRetryDelayMs(11), 6 * 60 * 60 * 1000);
  assert.equal(transactionalEmailRetryDelayMs(99), 6 * 60 * 60 * 1000);
});

test("request notifications are cancelled after the request state changes", () => {
  assert.equal(bookingEmailStillRelevant("provider_new_request", "requested"), true);
  assert.equal(bookingEmailStillRelevant("unclaimed_provider_opportunity", "accepted"), false);
  assert.equal(bookingEmailStillRelevant("customer_request_received", "cancelled"), false);
});

test("time-sensitive notifications only send in their matching state", () => {
  assert.equal(bookingEmailStillRelevant("customer_quote_ready", "accepted"), true);
  assert.equal(bookingEmailStillRelevant("customer_quote_ready", "payment_authorized"), true);
  assert.equal(bookingEmailStillRelevant("customer_quote_ready", "cancelled"), false);
  assert.equal(bookingEmailStillRelevant("customer_request_declined", "cancelled"), true);
  assert.equal(bookingEmailStillRelevant("customer_arrival_confirmation_request", "scheduled"), true);
  assert.equal(bookingEmailStillRelevant("customer_arrival_confirmation_request", "in_progress"), false);
});

test("retryable magic links reuse one delivery window before rotating", () => {
  const start = Date.UTC(2026, 8, 20, 12, 0, 0);
  assert.equal(retryableMagicLinkSlot(start), retryableMagicLinkSlot(start + 9 * 60 * 1000));
  assert.notEqual(retryableMagicLinkSlot(start), retryableMagicLinkSlot(start + 10 * 60 * 1000));
});
