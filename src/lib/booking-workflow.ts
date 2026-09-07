import { and, eq, isNull, or } from "drizzle-orm";
import { getDb } from "@/db";
import {
  bookingEvidence,
  bookingEvents,
  bookings,
  businesses,
  disputes,
  providerTransfers,
  refunds
} from "@/db/schema";
import { scoreEvidence } from "@/lib/booking";
import { getStripe } from "@/lib/stripe";
import { evidenceConfidence } from "@/lib/trust";
import { canReleasePayment } from "@/lib/payment-policy";

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

async function ensureProviderTransfer(bookingId: string, amountCents?: number) {
  const db = getDb();
  const context = await getBookingContext(bookingId);
  if (!context) throw new Error("booking_not_found");

  const amount = amountCents ?? context.booking.providerAmountCents;
  if (!Number.isInteger(amount) || amount < 0 || amount > context.booking.providerAmountCents) throw new Error("invalid_transfer_amount");

  const [existing] = await db.select().from(providerTransfers)
    .where(eq(providerTransfers.bookingId, bookingId))
    .limit(1);

  if (existing) {
    // Never reset a claim or change the amount behind a Stripe idempotency key.
    if (existing.amountCents !== amount) throw new Error("transfer_amount_changed");
    return existing;
  }

  const [created] = await db.insert(providerTransfers).values({
    bookingId,
    businessId: context.business.id,
    amountCents: amount,
    status: "eligible",
    eligibleAt: new Date()
  }).onConflictDoNothing({ target: providerTransfers.bookingId }).returning();
  if (created) return created;
  const [concurrent] = await db.select().from(providerTransfers).where(eq(providerTransfers.bookingId, bookingId)).limit(1);
  if (!concurrent || concurrent.amountCents !== amount) throw new Error("transfer_amount_changed");
  return concurrent;
}

export async function releaseProviderTransfer(bookingId: string, amountCents?: number) {
  const db = getDb();
  const context = await getBookingContext(bookingId);
  if (!context) throw new Error("booking_not_found");
  if (!canReleasePayment(context.booking.status, amountCents !== undefined)) throw new Error("booking_not_eligible_for_payout");
  if (!context.booking.stripePaymentIntentId || !context.booking.stripeChargeId) throw new Error("payment_not_captured");
  if (!context.business.stripeConnectAccountId || !context.business.stripePayoutsEnabled) {
    throw new Error("provider_payout_not_ready");
  }
  if (await hasOpenDispute(bookingId)) throw new Error("booking_has_open_dispute");

  const transfer = await ensureProviderTransfer(bookingId, amountCents);
  if (transfer.status === "paid") return transfer;
  if (transfer.status === "reversed") throw new Error("transfer_already_reversed");
  if (transfer.amountCents === 0) {
    const [zero] = await db.update(providerTransfers).set({ status: "paid", transferredAt: new Date() })
      .where(eq(providerTransfers.id, transfer.id)).returning();
    return zero;
  }

  const [claimed] = await db.update(providerTransfers).set({ status: "processing" })
    .where(and(
      eq(providerTransfers.id, transfer.id),
      or(eq(providerTransfers.status, "eligible"), eq(providerTransfers.status, "failed"))
    )).returning();
  if (!claimed) {
    const [current] = await db.select().from(providerTransfers).where(eq(providerTransfers.id, transfer.id)).limit(1);
    return current ?? transfer;
  }

  try {
    const stripeTransfer = await getStripe().transfers.create({
      amount: claimed.amountCents,
      currency: context.booking.currency,
      destination: context.business.stripeConnectAccountId,
      transfer_group: `verotask_booking_${bookingId}`,
      source_transaction: context.booking.stripeChargeId,
      metadata: {
        verotask_booking_id: bookingId,
        verotask_business_id: context.business.id
      }
    }, { idempotencyKey: `verotask-transfer-${bookingId}-v1` });

    const [paid] = await db.update(providerTransfers).set({
      status: "paid",
      stripeTransferId: stripeTransfer.id,
      transferredAt: new Date()
    }).where(eq(providerTransfers.id, claimed.id)).returning();

    const nextStatus = context.booking.status === "cancelled" ? "cancelled" : "paid_out";
    await db.update(bookings).set({ status: nextStatus, updatedAt: new Date() }).where(and(eq(bookings.id, bookingId), eq(bookings.status, context.booking.status)));
    await recordBookingEvent({
      bookingId,
      eventType: "provider_transfer_paid",
      previousStatus: context.booking.status,
      nextStatus,
      metadata: { amountCents: claimed.amountCents, stripeTransferId: stripeTransfer.id }
    });
    return paid;
  } catch (error) {
    await db.update(providerTransfers).set({ status: "failed" }).where(eq(providerTransfers.id, claimed.id));
    throw error;
  }
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
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0 || input.amountCents > context.booking.subtotalCents) {
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

export async function reverseProviderTransfer(bookingId: string, amountCents: number) {
  const db = getDb();
  const [transfer] = await db.select().from(providerTransfers).where(eq(providerTransfers.bookingId, bookingId)).limit(1);
  if (!transfer?.stripeTransferId || transfer.status !== "paid" || amountCents <= 0) return null;
  const amount = Math.min(amountCents, transfer.amountCents);

  const reversal = await getStripe().transfers.createReversal(transfer.stripeTransferId, {
    amount,
    metadata: { verotask_booking_id: bookingId }
  }, { idempotencyKey: `verotask-reversal-${bookingId}-${amount}` });

  if (amount === transfer.amountCents) {
    await db.update(providerTransfers).set({ status: "reversed", reversedAt: new Date() }).where(eq(providerTransfers.id, transfer.id));
  }
  await recordBookingEvent({ bookingId, eventType: "provider_transfer_reversed", metadata: { amountCents: amount, reversalId: reversal.id } });
  return reversal;
}

