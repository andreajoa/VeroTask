import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { bookingAccess } from "@/lib/booking-access";
import { createEvidenceUpload } from "@/lib/storage";

const schema = z.object({
  kind: z.enum(["before", "after"]),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"])
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_upload" }, { status: 400 });

  const access = await bookingAccess(id, user.id);
  if (!access?.isProvider) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!["scheduled", "in_progress"].includes(access.booking.status)) {
    return NextResponse.json({ error: "evidence_upload_not_available" }, { status: 409 });
  }

  try {
    const upload = await createEvidenceUpload({ bookingId: id, kind: parsed.data.kind, contentType: parsed.data.contentType });
    return NextResponse.json(upload);
  } catch {
    return NextResponse.json({ error: "storage_not_configured" }, { status: 503 });
  }
}
