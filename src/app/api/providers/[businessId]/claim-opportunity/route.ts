import { and, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { bookingEvents, bookings, businesses, users } from "@/db/schema";
import { canonicalAppUrl } from "@/lib/app-url";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const user = await getCurrentUser();
  const { businessId } = await params;
  const bookingId = request.nextUrl.searchParams.get("booking");
  const base = canonicalAppUrl();

  if (!user) {
    const next = `/api/providers/${businessId}/claim-opportunity${bookingId ? `?booking=${encodeURIComponent(bookingId)}` : ""}`;
    return NextResponse.redirect(new URL(`/signin?next=${encodeURIComponent(next)}`, base));
  }
  if (!bookingId) return NextResponse.redirect(new URL("/dashboard?error=missing-opportunity", base));

  const db = getDb();
  const [[business], [booking]] = await Promise.all([
    db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1),
    db.select().from(bookings).where(and(eq(bookings.id, bookingId), eq(bookings.businessId, businessId))).limit(1)
  ]);

  if (!business || !booking) return NextResponse.redirect(new URL("/dashboard?error=opportunity-not-found", base));

  const businessEmail = business.publicEmail?.trim().toLowerCase();
  const userEmail = user.email.trim().toLowerCase();
  if (!businessEmail || businessEmail !== userEmail) {
    return NextResponse.redirect(new URL("/dashboard?error=claim-email-mismatch", base));
  }

  if (business.ownerUserId && business.ownerUserId !== user.id) {
    return NextResponse.redirect(new URL("/dashboard?error=profile-already-claimed", base));
  }

  let claimedNow = false;
  if (!business.ownerUserId) {
    const [claimed] = await db.update(businesses).set({
      ownerUserId: user.id,
      status: "active",
      active: true,
      updatedAt: new Date()
    }).where(and(
      eq(businesses.id, business.id),
      isNull(businesses.ownerUserId)
    )).returning();

    if (claimed) {
      claimedNow = true;
      await db.update(users).set({ role: "provider", updatedAt: new Date() }).where(eq(users.id, user.id));
      await db.insert(bookingEvents).values({
        bookingId: booking.id,
        actorUserId: user.id,
        eventType: "provider_profile_claimed_from_opportunity",
        metadata: { businessId: business.id, verifiedBy: "public_business_email" }
      });
    }
  }

  const target = `/bookings/${booking.id}?claimed=${claimedNow ? "1" : "0"}`;
  return NextResponse.redirect(new URL(target, base));
}
