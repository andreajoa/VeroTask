import { createHash, createHmac } from "node:crypto";
import { addHours } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { bookingEvidence } from "@/db/schema";
import { DEFAULT_GEOFENCE_METERS, proofOfServiceScore, type EvidenceSignal } from "@/lib/trust";

export const SERVICE_TIMEZONE = "America/New_York";

export function parseServiceLocalDateTime(value: string) {
  const parsed = fromZonedTime(value, SERVICE_TIMEZONE);
  if (Number.isNaN(parsed.getTime())) throw new Error("Invalid service date/time");
  return parsed;
}

export function protectionDeadlineFrom(completedAt: Date) {
  return addHours(completedAt, 24);
}

function bookingPinSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return secret;
}

export function servicePinForBooking(bookingId: string) {
  const digest = createHmac("sha256", bookingPinSecret()).update(`service-pin:${bookingId}`).digest();
  const number = digest.readUInt32BE(0) % 1_000_000;
  return number.toString().padStart(6, "0");
}

export function hashServicePin(pin: string) {
  return createHash("sha256").update(`${bookingPinSecret()}:${pin}`).digest("hex");
}

export function haversineDistanceMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const earthRadius = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(bLat - aLat);
  const dLng = toRadians(bLng - aLng);
  const lat1 = toRadians(aLat);
  const lat2 = toRadians(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * earthRadius * Math.asin(Math.sqrt(h)));
}

function isVerifiedGeo(row: typeof bookingEvidence.$inferSelect) {
  if (row.type !== "geo_check_in" && row.type !== "geo_check_out") return false;
  const configuredRadius = typeof row.metadata?.geofenceMeters === "number"
    ? row.metadata.geofenceMeters
    : DEFAULT_GEOFENCE_METERS;
  return row.distanceFromServiceMeters !== null && row.distanceFromServiceMeters <= configuredRadius;
}

export function evidenceSignals(rows: Array<typeof bookingEvidence.$inferSelect>): EvidenceSignal {
  const has = (type: typeof bookingEvidence.$inferSelect.type) => rows.some((row) => row.type === type);
  return {
    geoCheckIn: rows.some((row) => row.type === "geo_check_in" && isVerifiedGeo(row)),
    geoCheckOut: rows.some((row) => row.type === "geo_check_out" && isVerifiedGeo(row)),
    customerPin: has("customer_pin"),
    beforePhotos: rows.filter((row) => row.type === "before_photo" && Boolean(row.objectUrl)).length,
    afterPhotos: rows.filter((row) => row.type === "after_photo" && Boolean(row.objectUrl)).length,
    checklistCompleted: rows.some((row) => row.type === "checklist" && row.metadata?.completed === true),
    providerCompletionTimestamp: true
  };
}

export function scoreEvidence(rows: Array<typeof bookingEvidence.$inferSelect>) {
  return proofOfServiceScore(evidenceSignals(rows));
}
