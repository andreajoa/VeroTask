import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { bookingEvents, bookings } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { checkProviderAvailability } from "@/lib/availability";
import { requireProviderBooking } from "@/lib/booking-access";
import { sendCustomerAcceptedNotification } from "@/lib/booking-notifications";
import { canProviderAccept } from "@/lib/booking-state";
import { getCustomerReputationSummary } from "@/lib/reputation";
import { algorithmReputationScore } from "@/lib/reputation-score";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  let access;
  try { access = await requireProviderBooking(id, user.id); }
  catch { return NextResponse.json({ error: "forbidden" }, { status: 403 }); }

  if (!canProviderAccept(access.booking.status)) {
    return NextResponse.json({ error: "booking_not_awaiting_provider" }, { status: 409 });
  }
  if (access.booking.scheduledStart.getTime() <= Date.now()) {
    return NextResponse.json({ error: "booking_time_expired" }, { status: 409 });
  }

  const availability = await checkProviderAvailability(
    access.business.id,
    access.booking.scheduledStart,
    access.booking.scheduledEnd ?? access.booking.scheduledStart
  );
  if (!availability.available) {
    return NextResponse.json({ error: availability.reason ?? "schedule_conflict" }, { status: 409 });
  }

  const reputation = await getCustomerReputationSummary(access.booking.customerId);
  const reputationScore = algorithmReputationScore({
    rating: reputation.rating,
    ratingCount: reputation.ratingCount,
    completedJobs: reputation.completedJobs
  });

  const db = getDb();
  const [updated] = await db.update(bookings).set({
    status: "accepted",
    updatedAt: new Date()
  }).where(and(eq(bookings.id, id), eq(bookings.status, "requested"))).returning();
  if (!updated) return NextResponse.json({ error: "booking_state_changed" }, { status: 409 });

  await db.insert(bookingEvents).values({
    bookingId: id,
    actorUserId: user.id,
    eventType: "provider_accepted",
    previousStatus: "requested",
    nextStatus: "accepted",
    metadata: {
      customerRating: reputation.rating,
      customerRatingCount: reputation.ratingCount,
      customerCompletedJobs: reputation.completedJobs,
      customerReputationLabel: reputation.label,
      customerAlgorithmReputationScore: reputationScore
    }
  });

  try { await sendCustomerAcceptedNotification(id); }
  catch (error) { console.error("[VeroTask booking accepted notification]", error); }

  return NextResponse.json({ ok: true, status: "accepted" });
}
