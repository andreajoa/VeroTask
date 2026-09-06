import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { bilateralRatings } from "@/db/reputation-schema";
import { bookingEvents } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { requireProviderBooking } from "@/lib/booking-access";
import { refreshCustomerReputation } from "@/lib/reputation";

const schema = z.object({ rating: z.number().int().min(1).max(5) });
const ALLOWED_STATUSES = ["customer_confirmed", "auto_completed", "paid_out"];

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_rating" }, { status: 400 });

  let access;
  try { access = await requireProviderBooking(id, user.id); }
  catch { return NextResponse.json({ error: "forbidden" }, { status: 403 }); }

  if (!ALLOWED_STATUSES.includes(access.booking.status)) {
    return NextResponse.json({ error: "rating_not_available" }, { status: 409 });
  }

  const db = getDb();
  const [existing] = await db.select({ id: bilateralRatings.id }).from(bilateralRatings).where(and(
    eq(bilateralRatings.bookingId, id),
    eq(bilateralRatings.direction, "provider_to_customer")
  )).limit(1);
  if (existing) return NextResponse.json({ error: "rating_already_submitted" }, { status: 409 });

  await db.insert(bilateralRatings).values({
    bookingId: id,
    direction: "provider_to_customer",
    raterUserId: user.id,
    customerId: access.booking.customerId,
    businessId: access.business.id,
    rating: parsed.data.rating
  });

  const reputation = await refreshCustomerReputation(access.booking.customerId);
  await db.insert(bookingEvents).values({
    bookingId: id,
    actorUserId: user.id,
    eventType: "provider_rated_customer",
    metadata: {
      rating: parsed.data.rating,
      customerRating: reputation.rating,
      customerRatingCount: reputation.ratingCount
    }
  });

  return NextResponse.json({ ok: true, reputation });
}
