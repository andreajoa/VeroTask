"use server";

import { createHash, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { businessClaims, businesses, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { sendBusinessClaimVerificationEmail } from "@/lib/claim-email";

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function completeClaim(claimId: string, claimantUserId: string, businessId: string) {
  const db = getDb();
  const now = new Date();
  await db.update(businessClaims).set({ status: "verified", resolvedAt: now }).where(eq(businessClaims.id, claimId));
  await db.update(businesses).set({ ownerUserId: claimantUserId, status: "pending", updatedAt: now }).where(eq(businesses.id, businessId));
  await db.update(users).set({ role: "provider", updatedAt: now }).where(eq(users.id, claimantUserId));
}

export async function startBusinessClaim(slug: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/providers/${slug}/claim`)}`);

  const db = getDb();
  const [business] = await db.select().from(businesses).where(eq(businesses.slug, slug)).limit(1);
  if (!business) redirect("/services");
  if (business.ownerUserId) redirect(`/providers/${slug}?claim=already-owned`);

  const [existing] = await db.select().from(businessClaims).where(and(
    eq(businessClaims.businessId, business.id),
    eq(businessClaims.claimantUserId, user.id),
    eq(businessClaims.status, "pending")
  )).limit(1);
  if (existing) redirect(`/providers/${slug}/claim?claim=${existing.id}`);

  if (business.publicEmail) {
    const rawToken = randomBytes(32).toString("hex");
    const [claim] = await db.insert(businessClaims).values({
      businessId: business.id,
      claimantUserId: user.id,
      verificationMethod: "public_email",
      verificationMetadata: {
        tokenHash: hash(rawToken),
        sentTo: business.publicEmail.replace(/^(.{2}).*(@.*)$/, "$1***$2")
      }
    }).returning();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const verificationUrl = `${baseUrl}/api/claims/verify-email?claim=${claim.id}&token=${rawToken}`;
    await sendBusinessClaimVerificationEmail({ to: business.publicEmail, businessName: business.name, verificationUrl });
    redirect(`/providers/${slug}/claim?claim=${claim.id}&sent=1`);
  }

  if (business.websiteUrl) {
    const challenge = `verotask-${randomBytes(12).toString("hex")}`;
    const [claim] = await db.insert(businessClaims).values({
      businessId: business.id,
      claimantUserId: user.id,
      verificationMethod: "website_meta",
      verificationMetadata: { challenge }
    }).returning();
    redirect(`/providers/${slug}/claim?claim=${claim.id}`);
  }

  const [claim] = await db.insert(businessClaims).values({
    businessId: business.id,
    claimantUserId: user.id,
    verificationMethod: "exception_review",
    verificationMetadata: { reason: "No public business email or website available for automatic verification." }
  }).returning();
  redirect(`/providers/${slug}/claim?claim=${claim.id}&exception=1`);
}

export async function verifyWebsiteClaim(claimId: string, slug: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/providers/${slug}/claim?claim=${claimId}`)}`);

  const db = getDb();
  const [row] = await db.select({ claim: businessClaims, business: businesses })
    .from(businessClaims)
    .innerJoin(businesses, eq(businesses.id, businessClaims.businessId))
    .where(and(eq(businessClaims.id, claimId), eq(businessClaims.claimantUserId, user.id)))
    .limit(1);

  if (!row || row.claim.status !== "pending" || row.claim.verificationMethod !== "website_meta" || !row.business.websiteUrl) {
    redirect(`/providers/${slug}/claim?error=invalid-claim`);
  }

  const metadata = row.claim.verificationMetadata as { challenge?: string };
  const challenge = metadata.challenge;
  if (!challenge) redirect(`/providers/${slug}/claim?error=invalid-challenge`);

  let verified = false;
  try {
    const response = await fetch(row.business.websiteUrl, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    const html = await response.text();
    verified = response.ok && (html.includes(`name="verotask-verification" content="${challenge}"`) || html.includes(`content="${challenge}" name="verotask-verification"`) || html.includes(challenge));
  } catch {
    verified = false;
  }

  if (!verified) redirect(`/providers/${slug}/claim?claim=${claimId}&error=verification-not-found`);

  await completeClaim(row.claim.id, user.id, row.business.id);
  redirect("/dashboard?claimed=1");
}
