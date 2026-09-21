import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  bookingEvidence,
  bookingEvents,
  bookings,
  businesses,
  disputes
} from "@/db/schema";
import { scoreEvidence } from "@/lib/booking";
import { refundBookingPaymentAtomic } from "@/lib/dispute-workflow";
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
  return refundBookingPaymentAtomic(input);
}

export async function reverseProviderTransfer(_bookingId: string, _amountCents: number) {
  return null;
}
