import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { bilateralRatings } from "@/db/reputation-schema";
import { bookingEvents, businesses, reviews } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { requireCustomerBooking } from "@/lib/booking-access";

const schema = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().trim().max(3000).optional() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_review" }, { status: 400 });

  let access;
  try { access = await requireCustomerBooking(id, user.id); }
  catch { return NextResponse.json({ error: "forbidden" }, { status: 403 }); }
  if (!["customer_confirmed", "auto_completed", "paid_out"].includes(access.booking.status)) {
    return NextResponse.json({ error: "review_not_available" }, { status: 409 });
  }

  const db = getDb();
  const [existing] = await db.select({ id: reviews.id }).from(reviews).where(eq(reviews.bookingId, id)).limit(1);
  if (existing) return NextResponse.json({ error: "review_already_submitted" }, { status: 409 });

  await db.insert(reviews).values({
    bookingId: id,
    businessId: access.business.id,
    customerId: user.id,
    rating: parsed.data.rating,
    comment: parsed.data.comment,
    published: true
  });

  const [mutualExisting] = await db.select({ id: bilateralRatings.id }).from(bilateralRatings).where(and(
    eq(bilateralRatings.bookingId, id),
    eq(bilateralRatings.direction, "customer_to_provider")
  )).limit(1);
  if (!mutualExisting) {
    await db.insert(bilateralRatings).values({
      bookingId: id,
      direction: "customer_to_provider",
      raterUserId: user.id,
      customerId: user.id,
      businessId: access.business.id,
      rating: parsed.data.rating
    });
  }

  const all = await db.select({ rating: reviews.rating }).from(reviews).where(eq(reviews.businessId, access.business.id));
  const average = all.length ? all.reduce((sum, row) => sum + row.rating, 0) / all.length : 0;
  await db.update(businesses).set({ averageRating: average.toFixed(2), reviewCount: all.length, updatedAt: new Date() })
    .where(eq(businesses.id, access.business.id));
  await db.insert(bookingEvents).values({ bookingId: id, actorUserId: user.id, eventType: "customer_reviewed", metadata: { rating: parsed.data.rating } });

  return NextResponse.json({ ok: true, averageRating: average, reviewCount: all.length });
}
