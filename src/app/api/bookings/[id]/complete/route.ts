import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { bookingEvents, bookings } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { requireProviderBooking } from "@/lib/booking-access";
import { protectionDeadlineFrom } from "@/lib/booking";
import { bookingEvidenceSummary, POLICY_VERSION } from "@/lib/booking-workflow";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  let access;
  try { access = await requireProviderBooking(id, user.id); }
  catch { return NextResponse.json({ error: "forbidden" }, { status: 403 }); }

  if (!["scheduled", "in_progress"].includes(access.booking.status)) {
    return NextResponse.json({ error: "invalid_booking_status" }, { status: 409 });
  }
  if (Date.now() < access.booking.scheduledStart.getTime() - 30 * 60 * 1000) {
    return NextResponse.json({ error: "cannot_complete_before_service_window" }, { status: 409 });
  }

  const completedAt = new Date();
  const deadline = protectionDeadlineFrom(completedAt);
  const evidence = await bookingEvidenceSummary(id);
  const db = getDb();

  await db.update(bookings).set({
    status: "provider_completed",
    providerMarkedCompleteAt: completedAt,
    protectionDeadline: deadline,
    updatedAt: completedAt
  }).where(eq(bookings.id, id));
  await db.insert(bookingEvents).values({
    bookingId: id,
    actorUserId: user.id,
    eventType: "provider_marked_complete",
    previousStatus: access.booking.status,
    nextStatus: "provider_completed",
    metadata: {
      protectionDeadline: deadline.toISOString(),
      evidenceScore: evidence.score,
      evidenceConfidence: evidence.confidence,
      policyVersion: POLICY_VERSION
    }
  });

  return NextResponse.json({
    ok: true,
    status: "provider_completed",
    protectionDeadline: deadline.toISOString(),
    evidenceScore: evidence.score,
    evidenceConfidence: evidence.confidence
  });
}
