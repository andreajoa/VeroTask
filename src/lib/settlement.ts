import { and, eq, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { bookings } from "@/db/schema";
import { hasOpenDispute, recordBookingEvent, releaseProviderTransfer } from "@/lib/booking-workflow";
import { evaluateBookingEvidence } from "@/lib/evidence-policy";
import { canAutoComplete } from "@/lib/trust";

export async function autoSettleExpiredBookings(limit = 50) {
  const db = getDb();
  const now = new Date();
  const candidates = await db.select().from(bookings)
    .where(and(eq(bookings.status, "provider_completed"), lte(bookings.protectionDeadline, now)))
    .limit(Math.max(1, Math.min(limit, 100)));

  const results: Array<{ bookingId: string; action: string; score?: number; missing?: string[] }> = [];
  for (const booking of candidates) {
    const openDispute = await hasOpenDispute(booking.id);
    const evidence = await evaluateBookingEvidence(booking.id);

    if (openDispute) {
      results.push({ bookingId: booking.id, action: "dispute_open", score: evidence.score });
      continue;
    }
    if (!evidence.requirementsSatisfied) {
      results.push({ bookingId: booking.id, action: "manual_review_missing_required_evidence", score: evidence.score, missing: evidence.missingRequirements });
      continue;
    }
    if (!canAutoComplete(evidence.score, false)) {
      results.push({ bookingId: booking.id, action: "manual_review_low_evidence", score: evidence.score });
      continue;
    }

    const [claimed] = await db.update(bookings).set({
      status: "auto_completed",
      autoCompletedAt: now,
      payoutEligibleAt: now,
      updatedAt: now
    }).where(and(eq(bookings.id, booking.id), eq(bookings.status, "provider_completed"))).returning();
    if (!claimed) continue;

    await recordBookingEvent({
      bookingId: booking.id,
      eventType: "booking_auto_completed",
      previousStatus: "provider_completed",
      nextStatus: "auto_completed",
      metadata: {
        score: evidence.score,
        confidence: evidence.confidence,
        requiredEvidenceSatisfied: true
      }
    });

    try {
      await releaseProviderTransfer(booking.id);
      results.push({ bookingId: booking.id, action: "paid", score: evidence.score });
    } catch {
      results.push({ bookingId: booking.id, action: "payout_retry_needed", score: evidence.score });
    }
  }
  return results;
}
