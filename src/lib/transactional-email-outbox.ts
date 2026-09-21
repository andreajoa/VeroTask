import { and, eq, inArray, lte, or } from "drizzle-orm";
import { getDb, getTransactionalDb } from "@/db";
import { transactionalEmailOutbox } from "@/db/operations-schema";
import { bookings } from "@/db/schema";
import { canonicalAppUrl } from "@/lib/app-url";
import { createRetryableMagicLink } from "@/lib/auth";
import {
  sendCustomerAcceptedNotification,
  sendCustomerArrivalConfirmationRequest,
  sendCustomerDeclinedNotification,
  sendCustomerRequestReceivedNotification,
  sendProviderNewRequestNotification,
  sendUnclaimedProviderOpportunityNotification
} from "@/lib/booking-notifications";

export type TransactionalEmailKind =
  | "provider_new_request"
  | "unclaimed_provider_opportunity"
  | "customer_request_received"
  | "customer_quote_ready"
  | "customer_request_declined"
  | "customer_arrival_confirmation_request";

type OutboxWriter = Pick<ReturnType<typeof getTransactionalDb>, "insert">;

export type QueueBookingEmailInput = {
  kind: TransactionalEmailKind;
  bookingId: string;
  recipientEmail?: string | null;
  idempotencyKey: string;
  payload?: Record<string, unknown>;
  expiresAt?: Date | null;
};

export async function queueBookingEmail(writer: OutboxWriter, input: QueueBookingEmailInput) {
  await writer.insert(transactionalEmailOutbox).values({
    kind: input.kind,
    bookingId: input.bookingId,
    recipientEmail: input.recipientEmail,
    idempotencyKey: input.idempotencyKey,
    payload: input.payload ?? {},
    expiresAt: input.expiresAt
  }).onConflictDoNothing({ target: transactionalEmailOutbox.idempotencyKey });
}

export async function enqueueBookingEmail(input: QueueBookingEmailInput) {
  return queueBookingEmail(getTransactionalDb(), input);
}

export function transactionalEmailRetryDelayMs(attemptCount: number) {
  const exponent = Math.max(0, Math.min(attemptCount - 1, 20));
  return Math.min(6 * 60 * 60 * 1000, 30_000 * 2 ** exponent);
}

export function bookingEmailStillRelevant(kind: TransactionalEmailKind, status: string) {
  if (["provider_new_request", "unclaimed_provider_opportunity", "customer_request_received"].includes(kind)) {
    return status === "requested";
  }
  if (kind === "customer_quote_ready") return ["accepted", "payment_authorized"].includes(status);
  if (kind === "customer_request_declined") return ["cancelled", "refunded"].includes(status);
  if (kind === "customer_arrival_confirmation_request") return status === "scheduled";
  return false;
}

function safeDeliveryError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const allowed = [
    "RESEND_API_KEY is not configured",
    "EMAIL_FROM is required in production",
    "email_context_unavailable",
    "outbox_booking_missing",
    "outbox_recipient_missing",
    "outbox_kind_unsupported"
  ];
  return allowed.includes(message) ? message : "email_delivery_failed";
}

async function dispatch(row: typeof transactionalEmailOutbox.$inferSelect) {
  if (!row.bookingId) throw new Error("outbox_booking_missing");
  const key = row.idempotencyKey;
  if (row.kind === "provider_new_request") return sendProviderNewRequestNotification(row.bookingId, key);
  if (row.kind === "customer_request_received") return sendCustomerRequestReceivedNotification(row.bookingId, key);
  if (row.kind === "customer_quote_ready") return sendCustomerAcceptedNotification(row.bookingId, key);
  if (row.kind === "customer_request_declined") return sendCustomerDeclinedNotification(row.bookingId, key);
  if (row.kind === "unclaimed_provider_opportunity") {
    if (!row.recipientEmail) throw new Error("outbox_recipient_missing");
    const auth = await createRetryableMagicLink(row.recipientEmail, `/opportunities/${row.bookingId}/claim`, row.idempotencyKey, canonicalAppUrl());
    return sendUnclaimedProviderOpportunityNotification(row.bookingId, row.recipientEmail, auth.link, auth.deliveryKey);
  }
  if (row.kind === "customer_arrival_confirmation_request") {
    if (!row.recipientEmail) throw new Error("outbox_recipient_missing");
    const auth = await createRetryableMagicLink(row.recipientEmail, `/bookings/${row.bookingId}?arrival=requested`, row.idempotencyKey, canonicalAppUrl());
    return sendCustomerArrivalConfirmationRequest(row.bookingId, row.recipientEmail, auth.link, auth.deliveryKey);
  }
  throw new Error("outbox_kind_unsupported");
}

export async function processTransactionalEmailOutbox(limit = 50, bookingId?: string) {
  const db = getDb();
  const now = new Date();
  const staleClaim = new Date(now.getTime() - 10 * 60 * 1000);
  const due = or(
    and(inArray(transactionalEmailOutbox.status, ["queued", "retry"]), lte(transactionalEmailOutbox.nextAttemptAt, now)),
    and(eq(transactionalEmailOutbox.status, "processing"), lte(transactionalEmailOutbox.updatedAt, staleClaim))
  );
  const rows = await db.select().from(transactionalEmailOutbox)
    .where(bookingId ? and(eq(transactionalEmailOutbox.bookingId, bookingId), due) : due)
    .limit(Math.max(1, Math.min(limit, 200)));

  const result = { selected: rows.length, sent: 0, retried: 0, dead: 0, skipped: 0 };
  for (const row of rows) {
    const attempt = row.attemptCount + 1;
    const [claimed] = await db.update(transactionalEmailOutbox).set({
      status: "processing",
      attemptCount: attempt,
      // Claim time, never the batch timestamp: a long batch would otherwise
      // stamp late claims as already stale and let a concurrent run re-claim
      // and re-send them mid-flight.
      updatedAt: new Date()
    }).where(and(
      eq(transactionalEmailOutbox.id, row.id),
      eq(transactionalEmailOutbox.attemptCount, row.attemptCount),
      inArray(transactionalEmailOutbox.status, ["queued", "retry", "processing"])
    )).returning();
    if (!claimed) continue;

    const [booking] = row.bookingId
      ? await db.select({ status: bookings.status }).from(bookings).where(eq(bookings.id, row.bookingId)).limit(1)
      : [];
    const expired = Boolean(row.expiresAt && row.expiresAt <= now);
    if (!booking || expired || !bookingEmailStillRelevant(row.kind as TransactionalEmailKind, booking.status)) {
      await db.update(transactionalEmailOutbox).set({ status: expired ? "expired" : "cancelled", updatedAt: new Date() })
        .where(eq(transactionalEmailOutbox.id, row.id));
      result.skipped += 1;
      continue;
    }

    try {
      const delivery = await dispatch(claimed);
      if (!delivery) throw new Error("email_context_unavailable");
      await db.update(transactionalEmailOutbox).set({
        status: "sent",
        providerEmailId: delivery.id,
        sentAt: new Date(),
        lastError: null,
        updatedAt: new Date()
      }).where(eq(transactionalEmailOutbox.id, row.id));
      result.sent += 1;
    } catch (error) {
      const dead = attempt >= row.maxAttempts;
      await db.update(transactionalEmailOutbox).set({
        status: dead ? "dead" : "retry",
        nextAttemptAt: new Date(Date.now() + transactionalEmailRetryDelayMs(attempt)),
        lastError: safeDeliveryError(error),
        updatedAt: new Date()
      }).where(eq(transactionalEmailOutbox.id, row.id));
      if (dead) result.dead += 1;
      else result.retried += 1;
    }
  }
  return result;
}

export async function kickTransactionalEmailOutbox(bookingId: string) {
  try {
    const first = await processTransactionalEmailOutbox(10, bookingId);
    if (first.retried > 0) {
      await new Promise((resolve) => setTimeout(resolve, transactionalEmailRetryDelayMs(1) + 250));
      return await processTransactionalEmailOutbox(10, bookingId);
    }
    return first;
  } catch {
    console.error("[VeroTask outbox] immediate delivery failed");
    return null;
  }
}
