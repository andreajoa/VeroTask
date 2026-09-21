import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, getTransactionalDb } from "@/db";
import { bookingEvidence, bookingEvents, bookings } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { bookingAccess } from "@/lib/booking-access";
import { canSubmitBookingEvidence, normalizeEvidenceMetadata, type SubmittedEvidenceType } from "@/lib/evidence-policy";
import { deleteEvidenceObject, inspectEvidenceObject, isEvidenceObjectRef } from "@/lib/storage";

const schema = z.object({
  type: z.enum(["before_photo", "after_photo", "checklist", "message", "provider_note", "customer_note"]),
  objectRef: z.string().max(2000).optional(),
  note: z.string().trim().max(4000).optional()
});

async function deleteUnattachedPhotoUpload(input: {
  bookingId: string;
  objectRef: string | undefined;
  type: SubmittedEvidenceType;
}) {
  if (!input.objectRef || !["before_photo", "after_photo"].includes(input.type) || !isEvidenceObjectRef(input.objectRef)) return;
  const kind = input.type === "before_photo" ? "before" : "after";
  if (!input.objectRef.startsWith(`r2://booking-evidence/${input.bookingId}/${kind}/`)) return;
  try {
    const db = getDb();
    const [attached] = await db.select({ id: bookingEvidence.id }).from(bookingEvidence)
      .where(eq(bookingEvidence.objectUrl, input.objectRef)).limit(1);
    if (!attached) await deleteEvidenceObject(input.objectRef);
  } catch {
    // If attachment state cannot be confirmed, retain the object instead of
    // risking deletion of evidence already referenced by the database.
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid_evidence" }, { status: 400 });

  const access = await bookingAccess(id, user.id);
  if (!access?.allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const actor = access.isProvider ? "provider" as const : "customer" as const;
  if (!canSubmitBookingEvidence({ actor, status: access.booking.status, type: parsed.data.type as SubmittedEvidenceType })) {
    if (actor === "provider") {
      await deleteUnattachedPhotoUpload({ bookingId: id, objectRef: parsed.data.objectRef, type: parsed.data.type });
    }
    return NextResponse.json({ error: "evidence_not_available_for_actor_or_status" }, { status: 409 });
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
  let verifiedPhoto: { byteSize: number; contentType: "image/jpeg" | "image/png" | "image/webp" } | undefined;
  if (isPhoto && parsed.data.objectRef) {
    const kind = parsed.data.type === "before_photo" ? "before" : "after";
    if (!parsed.data.objectRef.includes(`/${id}/${kind}/`)) return NextResponse.json({ error: "evidence_reference_kind_mismatch" }, { status: 400 });
    const inspected = await inspectEvidenceObject(parsed.data.objectRef);
    if (!inspected.ok) {
      await deleteEvidenceObject(parsed.data.objectRef).catch(() => undefined);
      return NextResponse.json({ error: inspected.reason }, { status: 400 });
    }
    verifiedPhoto = inspected;
  }

  let result:
    | { ok: true; evidenceId: string }
    | { ok: false; error: "booking_not_found" | "evidence_not_available_for_actor_or_status" | "photo_upload_already_attached" };
  try {
    result = await getTransactionalDb().transaction(async (tx) => {
      const [currentBooking] = await tx.select({ status: bookings.status }).from(bookings)
        .where(eq(bookings.id, id)).for("update").limit(1);
      if (!currentBooking) return { ok: false as const, error: "booking_not_found" as const };
      if (!canSubmitBookingEvidence({ actor, status: currentBooking.status, type: parsed.data.type as SubmittedEvidenceType })) {
        return { ok: false as const, error: "evidence_not_available_for_actor_or_status" as const };
      }
      if (parsed.data.objectRef) {
        const [attached] = await tx.select({ id: bookingEvidence.id }).from(bookingEvidence)
          .where(eq(bookingEvidence.objectUrl, parsed.data.objectRef)).limit(1);
        if (attached) return { ok: false as const, error: "photo_upload_already_attached" as const };
      }

      const [evidence] = await tx.insert(bookingEvidence).values({
        bookingId: id,
        submittedByUserId: user.id,
        type: parsed.data.type,
        objectUrl: parsed.data.objectRef,
        note: parsed.data.note,
        metadata: normalizeEvidenceMetadata(parsed.data.type as SubmittedEvidenceType, verifiedPhoto)
      }).returning();
      await tx.insert(bookingEvents).values({
        bookingId: id,
        actorUserId: user.id,
        eventType: `evidence_${parsed.data.type}`,
        metadata: { evidenceId: evidence.id }
      });
      return { ok: true as const, evidenceId: evidence.id };
    });
  } catch (error) {
    await deleteUnattachedPhotoUpload({ bookingId: id, objectRef: parsed.data.objectRef, type: parsed.data.type });
    throw error;
  }
  if (!result.ok) {
    if (result.error !== "photo_upload_already_attached") {
      await deleteUnattachedPhotoUpload({ bookingId: id, objectRef: parsed.data.objectRef, type: parsed.data.type });
    }
    return NextResponse.json({ error: result.error }, { status: result.error === "booking_not_found" ? 404 : 409 });
  }

  return NextResponse.json({ ok: true, evidenceId: result.evidenceId });
}
