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

function postgresErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const direct = "code" in error ? (error as { code?: unknown }).code : undefined;
  if (typeof direct === "string") return direct;
  const cause = "cause" in error ? (error as { cause?: unknown }).cause : undefined;
  if (cause && typeof cause === "object" && "code" in cause) {
    const nested = (cause as { code?: unknown }).code;
    if (typeof nested === "string") return nested;
  }
  return null;
}

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

  const db = getDb();
  let claimed;
  try {
    [claimed] = await db.update(bookings).set({
      status: "accepted",
      updatedAt: new Date()
    }).where(and(eq(bookings.id, id), eq(bookings.status, "requested"))).returning();
  } catch (error) {
    // PostgreSQL exclusion_violation. The database is the final authority when
    // simultaneous provider-accept operations race for the same time window.
    if (postgresErrorCode(error) === "23P01") {
      return NextResponse.json({ error: "schedule_conflict" }, { status: 409 });
    }
    throw error;
  }
  if (!claimed) return NextResponse.json({ error: "booking_state_changed" }, { status: 409 });

  const availability = await checkProviderAvailability(
    access.business.id,
    claimed.scheduledStart,
    claimed.scheduledEnd ?? claimed.scheduledStart,
    id
  );
  if (!availability.available) {
    await db.update(bookings).set({ status: "requested", updatedAt: new Date() })
      .where(and(eq(bookings.id, id), eq(bookings.status, "accepted")));
    return NextResponse.json({ error: availability.reason ?? "schedule_conflict" }, { status: 409 });
  }

  const reputation = await getCustomerReputationSummary(claimed.customerId);
  const reputationScore = algorithmReputationScore({
    rating: reputation.rating,
    ratingCount: reputation.ratingCount,
    completedJobs: reputation.completedJobs
  });

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
