import { createHash, timingSafeEqual } from "node:crypto";
import { and, eq, isNull, ne } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { businessClaims, bookingEvents, bookings, businesses, users } from "@/db/schema";
import { canonicalAppUrl } from "@/lib/app-url";
import { createSessionForUser } from "@/lib/auth";

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function equalHash(a: string, b: string) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function GET(request: NextRequest) {
  const claimId = request.nextUrl.searchParams.get("claim");
  const rawToken = request.nextUrl.searchParams.get("token");
  const base = canonicalAppUrl();
  if (!claimId || !rawToken) return NextResponse.redirect(new URL("/signin?error=invalid-claim-link", base));

  const db = getDb();
  const [row] = await db.select({ claim: businessClaims, business: businesses })
    .from(businessClaims)
    .innerJoin(businesses, eq(businesses.id, businessClaims.businessId))
    .where(eq(businessClaims.id, claimId))
    .limit(1);

  if (!row || row.claim.status !== "pending" || row.claim.verificationMethod !== "opportunity_email") {
    return NextResponse.redirect(new URL("/signin?error=invalid-claim-link", base));
  }

  const ageMs = Date.now() - row.claim.createdAt.getTime();
  if (ageMs > 60 * 60 * 1000) {
    await db.update(businessClaims).set({ status: "rejected", resolvedAt: new Date() }).where(eq(businessClaims.id, row.claim.id));
    return NextResponse.redirect(new URL("/signin?error=expired-link", base));
  }

  const metadata = row.claim.verificationMetadata as {
    tokenHash?: string;
    bookingId?: string;
    requestedEmail?: string;
    previousEmail?: string;
  };
  const expected = metadata.tokenHash;
  const supplied = hash(rawToken);
  const bookingId = metadata.bookingId;
  const requestedEmail = metadata.requestedEmail?.trim().toLowerCase();
  if (!expected || !equalHash(expected, supplied) || !bookingId || !requestedEmail) {
    return NextResponse.redirect(new URL("/signin?error=invalid-claim-link", base));
  }

  const [booking] = await db.select().from(bookings).where(and(
    eq(bookings.id, bookingId),
    eq(bookings.businessId, row.business.id)
  )).limit(1);
  if (!booking) return NextResponse.redirect(new URL("/dashboard?error=opportunity-not-found", base));

  if (row.business.ownerUserId && row.business.ownerUserId !== row.claim.claimantUserId) {
    await db.update(businessClaims).set({ status: "rejected", resolvedAt: new Date() }).where(eq(businessClaims.id, row.claim.id));
    return NextResponse.redirect(new URL("/dashboard?error=profile-already-claimed", base));
  }

  const [existingRequestedUser] = await db.select().from(users).where(eq(users.email, requestedEmail)).limit(1);
  const ownerUserId = existingRequestedUser?.id ?? row.claim.claimantUserId;
  const now = new Date();

  if (!existingRequestedUser) {
    await db.update(users).set({ email: requestedEmail, role: "provider", updatedAt: now }).where(eq(users.id, row.claim.claimantUserId));
  } else {
    await db.update(users).set({ role: "provider", updatedAt: now }).where(eq(users.id, existingRequestedUser.id));
  }

  const [claimed] = await db.update(businesses).set({
    ownerUserId,
    publicEmail: requestedEmail,
    status: "active",
    active: true,
    updatedAt: now
  }).where(and(
    eq(businesses.id, row.business.id),
    isNull(businesses.ownerUserId)
  )).returning();

  if (!claimed && row.business.ownerUserId !== ownerUserId) {
    await db.update(businessClaims).set({ status: "rejected", resolvedAt: now }).where(eq(businessClaims.id, row.claim.id));
    return NextResponse.redirect(new URL("/dashboard?error=profile-already-claimed", base));
  }

  await db.update(businessClaims).set({ status: "verified", resolvedAt: now }).where(eq(businessClaims.id, row.claim.id));
  await db.update(businessClaims).set({ status: "revoked", resolvedAt: now }).where(and(
    eq(businessClaims.businessId, row.business.id),
    eq(businessClaims.status, "pending"),
    ne(businessClaims.id, row.claim.id)
  ));

  await db.insert(bookingEvents).values({
    bookingId,
    actorUserId: ownerUserId,
    eventType: "provider_profile_claimed_from_opportunity",
    metadata: {
      businessId: row.business.id,
      verifiedBy: "opportunity_email",
      emailUpdated: metadata.previousEmail !== requestedEmail,
      exactAddressStillWithheld: true
    }
  });

  await createSessionForUser(ownerUserId);
  return NextResponse.redirect(new URL(`/bookings/${bookingId}?claimed=1`, base));
}
