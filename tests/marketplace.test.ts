import assert from "node:assert/strict";
import test from "node:test";
import { quoteWindowEndFor } from "../src/lib/job-request-policy";
import { checkPreBookingMessage } from "../src/lib/marketplace-messaging";
import { calculateQuoteFromCustomerServicePrice, calculateQuoteFromProviderDesiredPayout } from "../src/lib/quote-pricing";

test("provider can quote the exact payout they want while customer pricing stays auditable", () => {
  const quote = calculateQuoteFromProviderDesiredPayout(10_000, "free");
  assert.equal(quote.providerPayoutCents, 10_000);
  assert.equal(quote.serviceSubtotalCents - quote.providerCommissionCents, 10_000);
  assert.equal(quote.customerTotalCents, quote.serviceSubtotalCents + quote.customerProtectionFeeCents);
  assert.ok(quote.customerProtectionFeeCents >= 199);
});

test("customer counter offer recalculates provider payout without changing the quoted service price", () => {
  const quote = calculateQuoteFromCustomerServicePrice(14_000, "pro");
  assert.equal(quote.serviceSubtotalCents, 14_000);
  assert.equal(quote.providerCommissionCents, 1_400);
  assert.equal(quote.providerPayoutCents, 12_600);
  assert.equal(quote.customerTotalCents, 14_000 + quote.customerProtectionFeeCents);
});

test("short-notice jobs still keep a real quote window open", () => {
  const now = new Date("2026-09-06T12:00:00.000Z");
  const start = new Date("2026-09-06T13:00:00.000Z");
  const end = quoteWindowEndFor(start, now);
  assert.equal(end.toISOString(), "2026-09-06T12:30:00.000Z");
  assert.ok(end.getTime() > now.getTime());
});

test("long-range jobs cap quote collection to 48 hours", () => {
  const now = new Date("2026-09-06T12:00:00.000Z");
  const start = new Date("2026-09-12T12:00:00.000Z");
  const end = quoteWindowEndFor(start, now);
  assert.equal(end.toISOString(), "2026-09-08T12:00:00.000Z");
});

test("pre-booking chat blocks direct contact and off-platform payment while allowing normal scope questions", () => {
  assert.equal(checkPreBookingMessage("Can you also clean the inside of the refrigerator?").allowed, true);
  assert.equal(checkPreBookingMessage("Text me at 407-555-1212").allowed, false);
  assert.equal(checkPreBookingMessage("Email me at customer@example.com").allowed, false);
  assert.equal(checkPreBookingMessage("I can pay you with Zelle").allowed, false);
  assert.equal(checkPreBookingMessage("Message me on WhatsApp").allowed, false);
  assert.equal(checkPreBookingMessage("My website is https://example.com").allowed, false);
  assert.equal(checkPreBookingMessage("Find me on Instagram").allowed, false);
});
