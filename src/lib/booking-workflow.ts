import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  bookingEvidence,
  bookingEvents,
  bookings,
  businesses,
  disputes,
  refunds
} from "@/db/schema";
import { scoreEvidence } from "@/lib/booking";
import { getStripe } from "@/lib/stripe";
import { evidenceConfidence } from "@/lib/trust";

export const POLICY_VERSION = "2026-09-17-fee-only";

export async function getBookingContext(bookingId: string) {
  const db = getDb();
  const [row] = await db.select({ booking: bookings, business: businesses })
    .from(bookings)
    .innerJoin(businesses, eq(businesses.id, bookings.businessId))
    .where(eq(bookings.id, bookingId))
    .limit(1);
  return row ?? null;
}

export async function recordBookingEvent(input: {
  bookingId: string;
  actorUserId?: string | null;
  eventType: string;
  previousStatus?: string | null;
  nextStatus?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const db = getDb();
  await db.insert(bookingEvents).values({
    bookingId: input.bookingId,
    actorUserId: input.actorUserId ?? null,
    eventType: input.eventType,
    previousStatus: input.previousStatus ?? null,
    nextStatus: input.nextStatus ?? null,
    metadata: input.metadata ?? {}
  });
}

export async function bookingEvidenceSummary(bookingId: string) {
  const db = getDb();
  const [rows, events] = await Promise.all([
    db.select().from(bookingEvidence).where(eq(bookingEvidence.bookingId, bookingId)),
    db.select({ eventType: bookingEvents.eventType }).from(bookingEvents).where(eq(bookingEvents.bookingId, bookingId))
  ]);
  const eventTypes = events.map((event) => event.eventType);
  const score = scoreEvidence(rows, eventTypes);
  return { rows, score, confidence: evidenceConfidence(score) };
}

export async function hasOpenDispute(bookingId: string) {
  const db = getDb();
  const [row] = await db.select({ id: disputes.id }).from(disputes)
    .where(and(eq(disputes.bookingId, bookingId), isNull(disputes.resolvedAt)))
    .limit(1);
  return Boolean(row);
}

// Compatibility shim for historical imports. VeroTask does not transfer the
// service price to a provider and this function intentionally moves no money.
export async function releaseProviderTransfer(bookingId: string, _amountCents?: number) {
  const context = await getBookingContext(bookingId);
  if (!context) throw new Error("booking_not_found");
  if (await hasOpenDispute(bookingId)) throw new Error("booking_has_open_dispute");
  await recordBookingEvent({
    bookingId,
    eventType: "legacy_provider_transfer_skipped",
    previousStatus: context.booking.status,
    nextStatus: context.booking.status,
    metadata: {
      paymentModel: "booking_fee_only",
      providerPaidDirectlyByCustomer: true,
      moneyMovedByVeroTask: false
    }
  });
  return null;
}

export async function refundBookingPayment(input: {
  bookingId: string;
  amountCents: number;
  reason: string;
  disputeId?: string;
}) {
  const db = getDb();
  const context = await getBookingContext(input.bookingId);
  if (!context) throw new Error("booking_not_found");
  if (!context.booking.stripePaymentIntentId) throw new Error("payment_not_captured");
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0 || input.amountCents > context.booking.marketplaceFeeCents) {
    throw new Error("invalid_refund_amount");
  }

  const stripeRefund = await getStripe().refunds.create({
    payment_intent: context.booking.stripePaymentIntentId,
    amount: input.amountCents,
    metadata: {
      verotask_booking_id: input.bookingId,
      verotask_dispute_id: input.disputeId ?? "",
      payment_model: "booking_fee_only"
    }
  }, { idempotencyKey: `verotask-refund-${input.bookingId}-${input.amountCents}-${input.disputeId ?? "policy"}` });

  const [existing] = await db.select().from(refunds).where(eq(refunds.stripeRefundId, stripeRefund.id)).limit(1);
  if (!existing) {
    await db.insert(refunds).values({
      bookingId: input.bookingId,
      disputeId: input.disputeId,
      status: stripeRefund.status === "succeeded" ? "succeeded" : "processing",
      amountCents: input.amountCents,
      reason: input.reason,
      stripeRefundId: stripeRefund.id,
      processedAt: stripeRefund.status === "succeeded" ? new Date() : undefined
    });
  }

  await recordBookingEvent({
    bookingId: input.bookingId,
    eventType: "refund_created",
    metadata: { amountCents: input.amountCents, stripeRefundId: stripeRefund.id, reason: input.reason, refundableAsset: "verotask_booking_fee" }
  });
  return stripeRefund;
}

export async function reverseProviderTransfer(_bookingId: string, _amountCents: number) {
  return null;
}
