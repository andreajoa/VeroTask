import assert from "node:assert/strict";
import test from "node:test";
import { lapsedOpenCheckoutSessions, type OpenCheckoutSession } from "../src/lib/stripe-webhook-liveness";

const now = new Date("2026-09-21T12:00:00.000Z");

function session(stripeSessionId: string, expiresAt: string, scope: "booking" | "provider" = "booking"): OpenCheckoutSession {
  return { scope, stripeSessionId, expiresAt: new Date(expiresAt) };
}

test("a session still open well past its expiry is evidence the webhook never arrived", () => {
  const lapsed = lapsedOpenCheckoutSessions([session("cs_live_overdue", "2026-09-20T12:00:00.000Z")], now);
  assert.equal(lapsed.length, 1);
  assert.equal(lapsed[0].stripeSessionId, "cs_live_overdue");
  assert.equal(lapsed[0].minutesOverdue, 1440);
});

test("a session that only just lapsed is still inside Stripe's delivery slack", () => {
  assert.deepEqual(lapsedOpenCheckoutSessions([session("cs_live_fresh", "2026-09-21T11:30:00.000Z")], now), []);
});

test("a session that has not expired yet is not evidence of anything", () => {
  assert.deepEqual(lapsedOpenCheckoutSessions([session("cs_live_future", "2026-09-21T13:00:00.000Z")], now), []);
});

test("sessions older than the window are dropped so the alarm can clear itself", () => {
  // Stripe never re-emits the expiry of a session that lapsed days ago; keeping
  // it would hold the alarm red forever after the endpoint is fixed.
  assert.deepEqual(lapsedOpenCheckoutSessions([session("cs_live_ancient", "2026-09-18T12:00:00.000Z")], now), []);
});

test("provider subscription checkouts are watched alongside booking checkouts, worst first", () => {
  const lapsed = lapsedOpenCheckoutSessions([
    session("cs_live_booking", "2026-09-21T09:00:00.000Z"),
    session("cs_live_plan", "2026-09-20T18:00:00.000Z", "provider")
  ], now);
  assert.deepEqual(lapsed.map((item) => item.stripeSessionId), ["cs_live_plan", "cs_live_booking"]);
  assert.deepEqual(lapsed.map((item) => item.scope), ["provider", "booking"]);
});
