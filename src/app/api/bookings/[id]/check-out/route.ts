import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { bookingEvidence, bookingEvents } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { requireProviderBooking } from "@/lib/booking-access";
import { haversineDistanceMeters } from "@/lib/booking";
import { DEFAULT_GEOFENCE_METERS } from "@/lib/trust";

const bodySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().positive().max(5000).optional()
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_location" }, { status: 400 });

  let access;
  try { access = await requireProviderBooking(id, user.id); }
  catch { return NextResponse.json({ error: "forbidden" }, { status: 403 }); }

  if (!["scheduled", "in_progress"].includes(access.booking.status)) {
    return NextResponse.json({ error: "invalid_booking_status" }, { status: 409 });
  }

  let distance: number | null = null;
  if (access.booking.serviceLatitude !== null && access.booking.serviceLongitude !== null) {
    distance = haversineDistanceMeters(
      parsed.data.latitude,
      parsed.data.longitude,
      access.booking.serviceLatitude,
      access.booking.serviceLongitude
    );
    if (distance > 1000) return NextResponse.json({ error: "too_far_from_service_location", distanceMeters: distance }, { status: 409 });
  }

  const db = getDb();
  await db.insert(bookingEvidence).values({
    bookingId: id,
    submittedByUserId: user.id,
    type: "geo_check_out",
    latitude: parsed.data.latitude,
    longitude: parsed.data.longitude,
    distanceFromServiceMeters: distance,
    metadata: {
      accuracyMeters: parsed.data.accuracyMeters,
      geofenceMeters: DEFAULT_GEOFENCE_METERS,
      geofenceVerified: distance !== null && distance <= DEFAULT_GEOFENCE_METERS
    }
  });
  await db.insert(bookingEvents).values({
    bookingId: id,
    actorUserId: user.id,
    eventType: "provider_checked_out",
    metadata: { distanceMeters: distance, geofenceMeters: DEFAULT_GEOFENCE_METERS }
  });

  return NextResponse.json({ ok: true, distanceMeters: distance, geofenceVerified: distance !== null && distance <= DEFAULT_GEOFENCE_METERS });
}
