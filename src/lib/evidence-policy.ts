import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { bookingEvidence, bookings, categories, services } from "@/db/schema";
import { evidenceSignals, scoreEvidence } from "@/lib/booking";
import { evidenceConfidence } from "@/lib/trust";

export async function evaluateBookingEvidence(bookingId: string) {
  const db = getDb();
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking) throw new Error("booking_not_found");

  const rows = await db.select().from(bookingEvidence).where(eq(bookingEvidence.bookingId, bookingId));
  const signals = evidenceSignals(rows);
  const score = scoreEvidence(rows);
  const missing: string[] = [];

  if (booking.serviceId) {
    const [service] = await db.select().from(services).where(eq(services.id, booking.serviceId)).limit(1);
    if (service?.categoryId) {
      const [category] = await db.select().from(categories).where(eq(categories.id, service.categoryId)).limit(1);
      if (category?.requiresBeforePhotos && (signals.beforePhotos ?? 0) < 1) missing.push("before_photo");
      if (category?.requiresAfterPhotos && (signals.afterPhotos ?? 0) < 1) missing.push("after_photo");
      if (category?.requiresChecklist && !signals.checklistCompleted) missing.push("checklist");
    }
  }

  // Every automatic completion must also contain an objective presence signal.
  // PIN is appropriate when the customer is present; geofenced check-in/out is
  // appropriate for unattended properties such as vacation rentals.
  const hasPresenceProof = Boolean(signals.customerPin || (signals.geoCheckIn && signals.geoCheckOut));
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
