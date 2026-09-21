import { count, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { bookingCheckoutSessions, providerCheckoutSessions } from "@/db/operations-schema";
import { bookingEvents } from "@/db/schema";

// Stripe emits checkout.session.expired shortly after a session lapses, but not
// instantly. An hour of slack keeps a merely slow event from reading as a dead
// endpoint.
export const LAPSED_SESSION_GRACE_MINUTES = 60;

// Stripe never re-emits the expiry of a session that lapsed days ago, so a
// session missed while the endpoint was misconfigured would keep the alarm red
// forever and train everyone to ignore it. Only the recent window counts, which
// lets the alarm clear itself once delivery is restored.
export const LAPSED_SESSION_WINDOW_HOURS = 48;

// These are written by the Stripe webhook and by nothing else in the codebase,
// so their timestamps are the only honest record of Stripe reaching this
// deployment. Keep in sync with src/app/api/stripe/webhook/route.ts.
const WEBHOOK_ONLY_EVENT_TYPES = ["payment_succeeded", "payment_requires_refund", "checkout_expired"];

export type OpenCheckoutSession = {
  scope: "booking" | "provider";
  stripeSessionId: string;
  expiresAt: Date;
};

export type LapsedCheckoutSession = {
  scope: "booking" | "provider";
  stripeSessionId: string;
  expiresAt: string;
  minutesOverdue: number;
};

export type StripeWebhookLiveness = {
  healthy: boolean;
  checkedAt: string;
  graceMinutes: number;
  windowHours: number;
  lapsedOpenSessions: LapsedCheckoutSession[];
  lastInboundEventAt: string | null;
  lastInboundEventType: string | null;
  confirmedPayments: number;
};

/**
 * Selects the sessions that prove Stripe is not reaching this deployment: past
 * `expires_at` by more than the grace period, still `open`, and recent enough
 * that Stripe would have emitted `checkout.session.expired` by now.
 */
export function lapsedOpenCheckoutSessions(sessions: OpenCheckoutSession[], now: Date): LapsedCheckoutSession[] {
  const overdueBefore = now.getTime() - LAPSED_SESSION_GRACE_MINUTES * 60_000;
  const windowStart = now.getTime() - LAPSED_SESSION_WINDOW_HOURS * 60 * 60_000;

  return sessions
    .filter((session) => {
      const expiry = session.expiresAt.getTime();
      return expiry < overdueBefore && expiry > windowStart;
    })
    .map((session) => ({
      scope: session.scope,
      stripeSessionId: session.stripeSessionId,
      expiresAt: session.expiresAt.toISOString(),
      minutesOverdue: Math.floor((now.getTime() - session.expiresAt.getTime()) / 60_000)
    }))
    .sort((a, b) => b.minutesOverdue - a.minutesOverdue);
}

/**
 * Reports whether Stripe events are still reaching this deployment, without
 * requiring a payment to find out.
 *
 * The app's own cancellation path also writes `expired` to these rows, but that
 * can only ever hide a problem, never invent one: every row considered here is
 * still `open`, so no local code has touched it.
 */
export async function checkStripeWebhookLiveness(now = new Date()): Promise<StripeWebhookLiveness> {
  const db = getDb();
  const [bookingRows, providerRows, [lastInbound], [payments]] = await Promise.all([
    db.select({ stripeSessionId: bookingCheckoutSessions.stripeSessionId, expiresAt: bookingCheckoutSessions.expiresAt })
      .from(bookingCheckoutSessions).where(eq(bookingCheckoutSessions.status, "open")).limit(200),
    db.select({ stripeSessionId: providerCheckoutSessions.stripeSessionId, expiresAt: providerCheckoutSessions.expiresAt })
      .from(providerCheckoutSessions).where(eq(providerCheckoutSessions.status, "open")).limit(200),
    db.select({ createdAt: bookingEvents.createdAt, eventType: bookingEvents.eventType }).from(bookingEvents)
      .where(inArray(bookingEvents.eventType, WEBHOOK_ONLY_EVENT_TYPES))
      .orderBy(desc(bookingEvents.createdAt)).limit(1),
    // Whether the booking fee has ever actually settled in this environment.
    // `checkout_expired` alone proves delivery works; only `payment_succeeded`
    // proves the post-payment half of the product has ever run.
    db.select({ total: count() }).from(bookingEvents).where(eq(bookingEvents.eventType, "payment_succeeded"))
  ]);

  const lapsed = lapsedOpenCheckoutSessions([
    ...bookingRows.map((row) => ({ scope: "booking" as const, ...row })),
    ...providerRows.map((row) => ({ scope: "provider" as const, ...row }))
  ], now);

  return {
    healthy: lapsed.length === 0,
    checkedAt: now.toISOString(),
    graceMinutes: LAPSED_SESSION_GRACE_MINUTES,
    windowHours: LAPSED_SESSION_WINDOW_HOURS,
    lapsedOpenSessions: lapsed,
    lastInboundEventAt: lastInbound?.createdAt?.toISOString() ?? null,
    lastInboundEventType: lastInbound?.eventType ?? null,
    confirmedPayments: payments?.total ?? 0
  };
}
