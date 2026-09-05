import { createHash, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { businessClaims, businesses, users } from "@/db/schema";

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
  if (!claimId || !rawToken) return NextResponse.redirect(new URL("/signin?error=invalid-claim-link", request.url));

  const db = getDb();
  const [row] = await db.select({ claim: businessClaims, business: businesses })
    .from(businessClaims)
    .innerJoin(businesses, eq(businesses.id, businessClaims.businessId))
    .where(eq(businessClaims.id, claimId))
    .limit(1);

  if (!row || row.claim.status !== "pending" || row.claim.verificationMethod !== "public_email") {
    return NextResponse.redirect(new URL("/signin?error=invalid-claim-link", request.url));
  }

  const metadata = row.claim.verificationMetadata as { tokenHash?: string };
  const expected = metadata.tokenHash;
  const supplied = hash(rawToken);
  if (!expected || !equalHash(expected, supplied)) {
    return NextResponse.redirect(new URL(`/providers/${row.business.slug}/claim?claim=${claimId}&error=invalid-token`, request.url));
  }

  const now = new Date();
  await db.update(businessClaims).set({ status: "verified", resolvedAt: now }).where(eq(businessClaims.id, row.claim.id));
  await db.update(businesses).set({ ownerUserId: row.claim.claimantUserId, status: "pending", updatedAt: now }).where(eq(businesses.id, row.business.id));
  await db.update(users).set({ role: "provider", updatedAt: now }).where(eq(users.id, row.claim.claimantUserId));

  return NextResponse.redirect(new URL("/dashboard?claimed=1", request.url));
}
