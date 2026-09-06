import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { bookingEvidence } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { bookingAccess } from "@/lib/booking-access";
import { createEvidenceDownload, isEvidenceObjectRef } from "@/lib/storage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; evidenceId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id, evidenceId } = await params;

  const access = await bookingAccess(id, user.id);
  const canReview = access?.allowed || user.role === "admin" || user.role === "support";
  if (!canReview) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = getDb();
  const [evidence] = await db.select().from(bookingEvidence).where(and(
    eq(bookingEvidence.id, evidenceId),
    eq(bookingEvidence.bookingId, id)
  )).limit(1);
  if (!evidence?.objectUrl || !isEvidenceObjectRef(evidence.objectUrl)) {
    return NextResponse.json({ error: "evidence_file_not_found" }, { status: 404 });
  }

  try {
    const signedUrl = await createEvidenceDownload(evidence.objectUrl);
    return NextResponse.redirect(signedUrl, 302);
  } catch {
    return NextResponse.json({ error: "evidence_storage_unavailable" }, { status: 503 });
  }
}
