import { randomUUID } from "node:crypto";
import { and, eq, gte } from "drizzle-orm";
import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, getTransactionalDb } from "@/db";
import { bookingEvidence, bookingEvents, users } from "@/db/schema";
import { requireProviderBooking } from "@/lib/booking-access";
import { haversineDistanceMeters } from "@/lib/booking";
import { DEFAULT_GEOFENCE_METERS } from "@/lib/trust";
import { getCurrentUser } from "@/lib/auth";
import { kickTransactionalEmailOutbox, queueBookingEmail } from "@/lib/transactional-email-outbox";

const bodySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().positive().max(5000).optional()
});

export const maxDuration = 60;

function allowedDistance(accuracyMeters?: number) {
  const accuracyAllowance = Math.min(Math.max(accuracyMeters ?? 0, 0), 150);
  return Math.min(500, DEFAULT_GEOFENCE_METERS + accuracyAllowance);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "location_required" }, { status: 400 });

  let access;
  try { access = await requireProviderBooking(id, user.id); }
  catch { return NextResponse.json({ error: "forbidden" }, { status: 403 }); }

  const booking = access.booking;
  if (booking.status !== "scheduled") {
    return NextResponse.json({ error: booking.status === "in_progress" ? "arrival_already_verified" : "invalid_booking_status" }, { status: 409 });
  }

  const now = Date.now();
  const earliest = booking.scheduledStart.getTime() - 4 * 60 * 60 * 1000;
  const latest = (booking.scheduledEnd ?? booking.scheduledStart).getTime() + 12 * 60 * 60 * 1000;
  if (now < earliest || now > latest) return NextResponse.json({ error: "outside_checkin_window" }, { status: 409 });

  if (booking.serviceLatitude === null || booking.serviceLongitude === null) {
    return NextResponse.json({ error: "service_location_not_geocoded" }, { status: 409 });
  }

  const distance = haversineDistanceMeters(
    parsed.data.latitude,
    parsed.data.longitude,
    booking.serviceLatitude,
    booking.serviceLongitude
  );
  const geofenceMeters = allowedDistance(parsed.data.accuracyMeters);
  if (distance > geofenceMeters) {
    return NextResponse.json({ error: "too_far_from_service_location", distanceMeters: distance, geofenceMeters }, { status: 409 });
  }

  const db = getDb();
  const since = new Date(Date.now() - 30 * 60 * 1000);
  const recentRequests = await db.select({ id: bookingEvents.id }).from(bookingEvents).where(and(
    eq(bookingEvents.bookingId, id),
    eq(bookingEvents.eventType, "provider_arrival_confirmation_requested"),
    gte(bookingEvents.createdAt, since)
  ));
  if (recentRequests.length >= 3) {
    return NextResponse.json({ error: "arrival_confirmation_rate_limited" }, { status: 429 });
  }

  const requestId = randomUUID();
  const [customer] = await db.select().from(users).where(eq(users.id, booking.customerId)).limit(1);
  if (!customer) return NextResponse.json({ error: "customer_not_found" }, { status: 404 });

  await getTransactionalDb().transaction(async (tx) => {
    const [geoEvidence] = await tx.insert(bookingEvidence).values({
      bookingId: id,
      submittedByUserId: user.id,
      type: "geo_check_in",
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      distanceFromServiceMeters: distance,
      metadata: {
        accuracyMeters: parsed.data.accuracyMeters,
        geofenceMeters,
        geofenceVerified: true,
        verificationMethod: "customer_confirmation_pending",
        arrivalRequestId: requestId
      }
    }).returning();
    await tx.insert(bookingEvents).values({
      bookingId: id,
      actorUserId: user.id,
      eventType: "provider_arrival_confirmation_requested",
      previousStatus: "scheduled",
      nextStatus: "scheduled",
      metadata: {
        requestId,
        distanceMeters: distance,
        geofenceMeters,
        geoEvidenceId: geoEvidence.id,
        requestedAt: new Date().toISOString()
      }
    });
    await queueBookingEmail(tx, {
      kind: "customer_arrival_confirmation_request",
      bookingId: id,
      recipientEmail: customer.email,
      idempotencyKey: `booking:${id}:arrival-confirmation:${requestId}`,
      payload: { requestId },
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    });
  });

  after(() => kickTransactionalEmailOutbox(id));

  return NextResponse.json({
    ok: true,
    pendingCustomerConfirmation: true,
    emailQueued: true,
    requestId,
    distanceMeters: distance,
    geofenceMeters
  });
}
