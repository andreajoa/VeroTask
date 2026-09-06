import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { bookingEvidence } from "@/db/schema";
import { logAdminAudit } from "@/lib/admin-audit";
import { isAdminSession } from "@/lib/admin-auth";
import { createEvidenceDownload, isEvidenceObjectRef } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ evidenceId: string }> }) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { evidenceId } = await params;
  const db = getDb();
  const [evidence] = await db.select().from(bookingEvidence).where(eq(bookingEvidence.id, evidenceId)).limit(1);
  if (!evidence?.objectUrl || !isEvidenceObjectRef(evidence.objectUrl)) return NextResponse.json({ error: "evidence_file_not_found" }, { status: 404 });

  try {
    const signedUrl = await createEvidenceDownload(evidence.objectUrl);
    await logAdminAudit({
      action: "evidence.view",
      resourceType: "booking_evidence",
      resourceId: evidence.id,
      metadata: { bookingId: evidence.bookingId, evidenceType: evidence.type },
      headers: request.headers
    });
    return NextResponse.redirect(signedUrl, 302);
  } catch {
    return NextResponse.json({ error: "evidence_storage_unavailable" }, { status: 503 });
  }
}
