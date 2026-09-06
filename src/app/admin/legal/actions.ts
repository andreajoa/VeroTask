"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { legalCases, legalHolds } from "@/db/analytics-schema";
import { logAdminAudit } from "@/lib/admin-audit";
import { isAdminSession } from "@/lib/admin-auth";

async function requireAdmin() {
  if (!(await isAdminSession())) redirect("/admin/signin");
}

export async function createLegalCase(formData: FormData) {
  await requireAdmin();
  const title = String(formData.get("title") || "").trim().slice(0, 240);
  const requesterType = String(formData.get("requesterType") || "internal").slice(0, 80);
  const requesterName = String(formData.get("requesterName") || "").trim().slice(0, 240) || null;
  const legalAuthority = String(formData.get("legalAuthority") || "").trim().slice(0, 4000) || null;
  const notes = String(formData.get("notes") || "").trim().slice(0, 6000) || null;
  const bookingId = String(formData.get("bookingId") || "").trim() || null;
  const userId = String(formData.get("userId") || "").trim() || null;
  const sessionId = String(formData.get("sessionId") || "").trim() || null;
  if (!title) redirect("/admin/legal?error=title-required");

  const caseReference = `VT-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(4).toString("hex").toUpperCase()}`;
  const db = getDb();
  const [legalCase] = await db.insert(legalCases).values({
    caseReference,
    title,
    requesterType,
    requesterName,
    legalAuthority,
    notes,
    scope: { bookingId, userId, sessionId },
    status: "preservation",
    createdBy: "password-admin"
  }).returning();

  if (bookingId || userId || sessionId) {
    await db.insert(legalHolds).values({
      caseId: legalCase.id,
      bookingId,
      userId,
      sessionId,
      reason: `Preservation hold for ${caseReference}: ${title}`
    });
  }

  await logAdminAudit({ action: "legal.case_created", resourceType: "legal_case", resourceId: legalCase.id, metadata: { caseReference, bookingId, userId, sessionId }, headers: await headers() });
  redirect(`/admin/legal?notice=created&case=${encodeURIComponent(caseReference)}`);
}
