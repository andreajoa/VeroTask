import { and, desc, eq, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { bookingEvents, bookings } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { requireCustomerBooking } from "@/lib/booking-access";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  let access;
  try { access = await requireCustomerBooking(id, user.id); }
  catch { return NextResponse.json({ error: "forbidden" }, { status: 403 }); }

  if (access.booking.status !== "scheduled") {
    return NextResponse.json({ error: access.booking.status === "in_progress" ? "arrival_already_verified" : "invalid_booking_status" }, { status: 409 });
  }

  const db = getDb();
  const since = new Date(Date.now() - 30 * 60 * 1000);
  const [requestEvent] = await db.select().from(bookingEvents).where(and(
    eq(bookingEvents.bookingId, id),
    eq(bookingEvents.eventType, "provider_arrival_confirmation_requested"),
    gte(bookingEvents.createdAt, since)
  )).orderBy(desc(bookingEvents.createdAt)).limit(1);

  if (!requestEvent) return NextResponse.json({ error: "no_recent_arrival_request" }, { status: 409 });

  const requestId = typeof requestEvent.metadata?.requestId === "string" ? requestEvent.metadata.requestId : null;
  if (!requestId) return NextResponse.json({ error: "invalid_arrival_request" }, { status: 409 });

  const [already] = await db.select({ id: bookingEvents.id }).from(bookingEvents).where(and(
    eq(bookingEvents.bookingId, id),
    eq(bookingEvents.eventType, "provider_arrival_verified")
  )).limit(1);
  if (already) return NextResponse.json({ ok: true, status: "in_progress", arrivalVerified: true });

  const [claimed] = await db.update(bookings).set({
    status: "in_progress",
    updatedAt: new Date()
  }).where(and(eq(bookings.id, id), eq(bookings.status, "scheduled"))).returning();
  if (!claimed) return NextResponse.json({ error: "booking_state_changed" }, { status: 409 });

  await db.insert(bookingEvents).values({
    bookingId: id,
    actorUserId: user.id,
    eventType: "customer_arrival_confirmed",
    previousStatus: "scheduled",
    nextStatus: "in_progress",
    metadata: {
      requestId,
      requestEventId: requestEvent.id,
      confirmedAt: new Date().toISOString()
    }
  });

  await db.insert(bookingEvents).values({
    bookingId: id,
    actorUserId: user.id,
    eventType: "provider_arrival_verified",
    previousStatus: "scheduled",
    nextStatus: "in_progress",
    metadata: {
      requestId,
      verificationMethod: "customer_confirmation_plus_geofence",
      requestEventId: requestEvent.id,
      confirmedAt: new Date().toISOString()
    }
  });

  return NextResponse.json({
    ok: true,
    status: "in_progress",
    arrivalVerified: true,
    verificationMethod: "customer_confirmation_plus_geofence"
  });
}
