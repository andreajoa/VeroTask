"use server";

import { createHash, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { businessClaims, bookings, businesses } from "@/db/schema";
import { canonicalAppUrl } from "@/lib/app-url";
import { getCurrentUser } from "@/lib/auth";
import { sendOpportunityEmailVerification } from "@/lib/booking-notifications";
import { parseQuoteRequestBrief } from "@/lib/quote-request";

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(320) });

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function requestOpportunityEmailVerification(bookingId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/opportunities/${bookingId}/claim`)}`);

  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) redirect(`/opportunities/${bookingId}/claim?error=invalid-email`);

  const db = getDb();
  const [row] = await db.select({ booking: bookings, business: businesses })
    .from(bookings)
    .innerJoin(businesses, eq(businesses.id, bookings.businessId))
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!row) redirect("/dashboard?error=opportunity-not-found");
  if (row.business.ownerUserId && row.business.ownerUserId !== user.id) redirect("/dashboard?error=profile-already-claimed");

  const listedEmail = row.business.publicEmail?.trim().toLowerCase();
  if (!listedEmail || listedEmail !== user.email.trim().toLowerCase()) redirect("/dashboard?error=claim-email-mismatch");

  const rawToken = randomBytes(32).toString("hex");
  const [claim] = await db.insert(businessClaims).values({
    businessId: row.business.id,
    claimantUserId: user.id,
    verificationMethod: "opportunity_email",
    verificationMetadata: {
      tokenHash: hash(rawToken),
      bookingId,
      requestedEmail: parsed.data.email,
      previousEmail: listedEmail
    }
  }).returning();

  const brief = parseQuoteRequestBrief(row.booking.customerNotes);
  const task = brief?.task ?? "Local service";
  const verificationUrl = `${canonicalAppUrl()}/api/claims/verify-opportunity-email?claim=${claim.id}&token=${rawToken}`;

  try {
    await sendOpportunityEmailVerification({
      to: parsed.data.email,
      businessName: row.business.name,
      task,
      verificationUrl
    });
  } catch (error) {
    console.error("[VeroTask opportunity verification]", error);
    await db.delete(businessClaims).where(and(eq(businessClaims.id, claim.id), eq(businessClaims.status, "pending")));
    redirect(`/opportunities/${bookingId}/claim?error=send-failed`);
  }

  redirect(`/opportunities/${bookingId}/claim?sent=1`);
}
