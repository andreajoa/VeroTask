import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { bookings, businesses } from "@/db/schema";
import { canonicalAppUrl } from "@/lib/app-url";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const user = await getCurrentUser();
  const { businessId } = await params;
  const bookingId = request.nextUrl.searchParams.get("booking");
  const base = canonicalAppUrl();

  if (!bookingId) return NextResponse.redirect(new URL("/dashboard?error=missing-opportunity", base));

  if (!user) {
    const next = `/api/providers/${businessId}/claim-opportunity?booking=${encodeURIComponent(bookingId)}`;
    return NextResponse.redirect(new URL(`/signin?next=${encodeURIComponent(next)}`, base));
  }

  const db = getDb();
  const [[business], [booking]] = await Promise.all([
    db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1),
    db.select().from(bookings).where(and(eq(bookings.id, bookingId), eq(bookings.businessId, businessId))).limit(1)
  ]);

  if (!business || !booking) return NextResponse.redirect(new URL("/dashboard?error=opportunity-not-found", base));

  if (business.ownerUserId === user.id) {
    return NextResponse.redirect(new URL(`/bookings/${booking.id}`, base));
  }

  const businessEmail = business.publicEmail?.trim().toLowerCase();
  const userEmail = user.email.trim().toLowerCase();
  if (!businessEmail || businessEmail !== userEmail) {
    return NextResponse.redirect(new URL("/dashboard?error=claim-email-mismatch", base));
  }

  if (business.ownerUserId && business.ownerUserId !== user.id) {
    return NextResponse.redirect(new URL("/dashboard?error=profile-already-claimed", base));
  }

  return NextResponse.redirect(new URL(`/opportunities/${booking.id}/claim`, base));
}
