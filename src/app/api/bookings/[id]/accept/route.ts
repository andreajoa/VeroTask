import { and, eq } from "drizzle-orm";
import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, getTransactionalDb } from "@/db";
import { bookingEvents, bookings, providerProfilePhotos } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { checkProviderAvailability } from "@/lib/availability";
import { requireProviderBooking } from "@/lib/booking-access";
import { canProviderAccept } from "@/lib/booking-state";
import { calculateBookingAmounts, type PlanKey } from "@/lib/plans";
import { getCustomerReputationSummary } from "@/lib/reputation";
import { algorithmReputationScore } from "@/lib/reputation-score";
import { kickTransactionalEmailOutbox, queueBookingEmail } from "@/lib/transactional-email-outbox";

const schema = z.object({
  quoteCents: z.number().int().min(1000).max(5_000_000)
});

export const maxDuration = 60;

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

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "valid_quote_required" }, { status: 400 });

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
  const [activePhoto] = await db.select({ id: providerProfilePhotos.id }).from(providerProfilePhotos).where(and(
    eq(providerProfilePhotos.businessId, access.business.id),
    eq(providerProfilePhotos.active, true)
  )).limit(1);
  if (!activePhoto) {
    return NextResponse.json({ error: "provider_photo_required" }, { status: 409 });
  }

  const availability = await checkProviderAvailability(
    access.business.id,
    access.booking.scheduledStart,
    access.booking.scheduledEnd ?? access.booking.scheduledStart,
    access.booking.id
  );
  if (!availability.available) {
    return NextResponse.json({ error: availability.reason }, { status: 409 });
  }

  const amounts = calculateBookingAmounts(parsed.data.quoteCents, access.business.plan as PlanKey);
  const reputation = await getCustomerReputationSummary(access.booking.customerId);
  const reputationScore = algorithmReputationScore({
    rating: reputation.rating,
    ratingCount: reputation.ratingCount,
    completedJobs: reputation.completedJobs
  });

  let claimed;
  try {
    claimed = await getTransactionalDb().transaction(async (tx) => {
      const [updated] = await tx.update(bookings).set({
        status: "accepted",
        subtotalCents: amounts.totalCents,
        marketplaceFeeCents: amounts.marketplaceFeeCents,
        providerAmountCents: amounts.providerAmountCents,
        commissionBpsSnapshot: amounts.commissionBps,
        updatedAt: new Date()
      }).where(and(eq(bookings.id, id), eq(bookings.status, "requested"))).returning();
      if (!updated) return null;

      await tx.insert(bookingEvents).values({
        bookingId: id,
        actorUserId: user.id,
        eventType: "provider_quote_submitted",
        previousStatus: "requested",
        nextStatus: "accepted",
        metadata: {
          quoteCents: amounts.totalCents,
          bookingFeeCents: amounts.marketplaceFeeCents,
          customerRating: reputation.rating,
          customerRatingCount: reputation.ratingCount,
          customerCompletedJobs: reputation.completedJobs,
          customerReputationLabel: reputation.label,
          customerAlgorithmReputationScore: reputationScore,
          exactAddressStillWithheld: true
        }
      });
      await queueBookingEmail(tx, {
        kind: "customer_quote_ready",
        bookingId: id,
        idempotencyKey: `booking:${id}:customer-quote-ready`
      });
      return updated;
    });
  } catch (error) {
    if (postgresErrorCode(error) === "23P01") {
      return NextResponse.json({ error: "schedule_conflict" }, { status: 409 });
    }
    throw error;
  }
  if (!claimed) return NextResponse.json({ error: "booking_state_changed" }, { status: 409 });

  after(() => kickTransactionalEmailOutbox(id));

  return NextResponse.json({
    ok: true,
    status: "accepted",
    quoteCents: amounts.totalCents,
    bookingFeeCents: amounts.marketplaceFeeCents
  });
}
