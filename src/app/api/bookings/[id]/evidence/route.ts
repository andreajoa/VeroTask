import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { bookingEvidence, bookingEvents } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { bookingAccess } from "@/lib/booking-access";
import { isEvidenceObjectRef } from "@/lib/storage";

const schema = z.object({
  type: z.enum(["before_photo", "after_photo", "checklist", "message", "provider_note", "customer_note"]),
  objectRef: z.string().max(2000).optional(),
  note: z.string().trim().max(4000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_evidence" }, { status: 400 });

  const access = await bookingAccess(id, user.id);
  if (!access?.allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const providerOnly = ["before_photo", "after_photo", "checklist", "provider_note"] as const;
  if (providerOnly.includes(parsed.data.type as typeof providerOnly[number]) && !access.isProvider) {
    return NextResponse.json({ error: "provider_evidence_only" }, { status: 403 });
  }
  if (parsed.data.type === "customer_note" && !access.isCustomer) {
    return NextResponse.json({ error: "customer_evidence_only" }, { status: 403 });
  }
  const isPhoto = parsed.data.type === "before_photo" || parsed.data.type === "after_photo";
  if (isPhoto && (!parsed.data.objectRef || !isEvidenceObjectRef(parsed.data.objectRef))) {
    return NextResponse.json({ error: "valid_private_photo_reference_required" }, { status: 400 });
  }
  if (!isPhoto && parsed.data.objectRef) {
    return NextResponse.json({ error: "object_reference_not_allowed_for_this_evidence_type" }, { status: 400 });
  }
  if (parsed.data.objectRef && !parsed.data.objectRef.includes(`/booking-evidence/${id}/`)) {
    return NextResponse.json({ error: "evidence_reference_booking_mismatch" }, { status: 400 });
  }

  const db = getDb();
  const [evidence] = await db.insert(bookingEvidence).values({
    bookingId: id,
    submittedByUserId: user.id,
    type: parsed.data.type,
    objectUrl: parsed.data.objectRef,
    note: parsed.data.note,
    metadata: parsed.data.metadata ?? {}
  }).returning();
  await db.insert(bookingEvents).values({
    bookingId: id,
    actorUserId: user.id,
    eventType: `evidence_${parsed.data.type}`,
    metadata: { evidenceId: evidence.id }
  });

  return NextResponse.json({ ok: true, evidenceId: evidence.id });
}
