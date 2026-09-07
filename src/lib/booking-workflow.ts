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

export const POLICY_VERSION = "2026-09-05";

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
  const rows = await db.select().from(bookingEvidence).where(eq(bookingEvidence.bookingId, bookingId));
  const score = scoreEvidence(rows);
  return { rows, score, confidence: evidenceConfidence(score) };
}

export async function hasOpenDispute(bookingId: string) {
  const db = getDb();
  const [row] = await db.select({ id: disputes.id }).from(disputes)
    .where(and(eq(disputes.bookingId, bookingId), isNull(disputes.resolvedAt)))
    .limit(1);
  return Boolean(row);
}

// In the VeroTask booking-fee model, providers receive payment directly from
// the customer at the service location. VeroTask only collects the booking fee.
// The releaseProviderTransfer function is kept as a no-op for backward
// compatibility with existing booking state-machine callers.
export async function releaseProviderTransfer(bookingId: string, _amountCents?: number) {
  const db = getDb();
  const context = await getBookingContext(bookingId);
  if (!context) throw new Error("booking_not_found");

  const nextStatus = context.booking.status === "cancelled" ? "cancelled" : "paid_out";
  await db.update(bookings).set({ status: nextStatus, updatedAt: new Date() }).where(eq(bookings.id, bookingId));
  await recordBookingEvent({
    bookingId,
    eventType: "booking_completed",
    previousStatus: context.booking.status,
    nextStatus,
    metadata: { model: "direct_payment" }
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
      verotask_dispute_id: input.disputeId ?? ""
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
    metadata: { amountCents: input.amountCents, stripeRefundId: stripeRefund.id, reason: input.reason }
  });
  return stripeRefund;
}

// No-op: in the booking-fee model there are no Stripe transfers to reverse.
export async function reverseProviderTransfer(_bookingId: string, _amountCents: number) {
  return null;
}

