import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { bookingEvidence, bookingEvents, bookings } from "@/db/schema";
import { evidenceSignals, scoreEvidence } from "@/lib/booking";
import { evidenceConfidence } from "@/lib/trust";

export async function evaluateBookingEvidence(bookingId: string) {
  const db = getDb();
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking) throw new Error("booking_not_found");

  const [rows, events] = await Promise.all([
    db.select().from(bookingEvidence).where(eq(bookingEvidence.bookingId, bookingId)),
    db.select({ eventType: bookingEvents.eventType }).from(bookingEvents).where(eq(bookingEvents.bookingId, bookingId))
  ]);
  const eventTypes = events.map((event) => event.eventType);
  const signals = evidenceSignals(rows, eventTypes);
  const score = scoreEvidence(rows, eventTypes);
  const missing: string[] = [];

  // Arrival proof is the platform's objective attendance record. It requires
  // provider geolocation plus either the customer PIN or direct customer confirmation.
  const hasPresenceProof = Boolean(signals.geoCheckIn && (signals.customerPin || signals.customerArrivalConfirmation));
  if (!hasPresenceProof) missing.push("presence_proof");

  return {
    rows,
    signals,
    score,
    confidence: evidenceConfidence(score),
    missingRequirements: [...new Set(missing)],
    requirementsSatisfied: missing.length === 0
  };
}
