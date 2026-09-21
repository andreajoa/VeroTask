import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { bookingEvidence, bookingEvents, bookings } from "@/db/schema";
import { evidenceSignals, scoreEvidence } from "@/lib/booking";
import { evidenceConfidence } from "@/lib/trust";

export const MAX_EVIDENCE_IMAGE_BYTES = 10 * 1024 * 1024;

export type EvidenceActor = "customer" | "provider";
export type SubmittedEvidenceType = "before_photo" | "after_photo" | "checklist" | "message" | "provider_note" | "customer_note";
export type EvidenceImageContentType = "image/jpeg" | "image/png" | "image/webp";

const ACTIVE_EVIDENCE_STATES = new Set(["scheduled", "in_progress"]);

export function canSubmitBookingEvidence(input: {
  actor: EvidenceActor;
  status: string;
  type: SubmittedEvidenceType;
}) {
  if (!ACTIVE_EVIDENCE_STATES.has(input.status)) return false;
  if (input.type === "customer_note") return input.actor === "customer";
  if (input.type === "message") return true;
  if (input.actor !== "provider") return false;
  if (["after_photo", "checklist"].includes(input.type)) return input.status === "in_progress";
  return true;
}

export function canCreateEvidenceUpload(status: string, kind: "before" | "after") {
  return status === "in_progress" || (kind === "before" && status === "scheduled");
}

export function normalizeEvidenceMetadata(type: SubmittedEvidenceType, photo?: {
  byteSize: number;
  contentType: EvidenceImageContentType;
}) {
  if (type === "checklist") return { completed: true, source: "provider_action" };
  if (photo) return { verifiedUpload: true, byteSize: photo.byteSize, contentType: photo.contentType };
  return {};
}

export function contentTypeForEvidenceObjectRef(objectRef: string): EvidenceImageContentType | null {
  if (/\.jpe?g$/i.test(objectRef)) return "image/jpeg";
  if (/\.png$/i.test(objectRef)) return "image/png";
  if (/\.webp$/i.test(objectRef)) return "image/webp";
  return null;
}

export function hasEvidenceImageMagic(bytes: Uint8Array, contentType: EvidenceImageContentType) {
  if (contentType === "image/png") {
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
  }
  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  return bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}

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
