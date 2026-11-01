import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { declineBookingAtomic } from "@/db/transactional-decline";
import { getCurrentUser } from "@/lib/auth";
import { requireProviderBooking } from "@/lib/booking-access";
import { canProviderDeclineBeforePayment } from "@/lib/booking-state";
import { kickTransactionalEmailOutbox } from "@/lib/transactional-email-outbox";

const schema = z.object({ reason: z.string().trim().max(500).optional() });

export const maxDuration = 60;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid_decline" }, { status: 400 });

  let access;
  try { access = await requireProviderBooking(id, user.id); }
  catch { return NextResponse.json({ error: "forbidden" }, { status: 403 }); }

  if (!canProviderDeclineBeforePayment(access.booking.status)) {
    return NextResponse.json({ error: "booking_cannot_be_declined" }, { status: 409 });
  }

  const updated = await declineBookingAtomic({
    bookingId: id,
    actorUserId: user.id,
    previousStatus: access.booking.status as 'requested' | 'accepted',
    reason: parsed.data.reason ?? null
  });
  if (!updated) return NextResponse.json({ error: "booking_state_changed" }, { status: 409 });

  after(() => kickTransactionalEmailOutbox(id));

  return NextResponse.json({ ok: true, status: "cancelled" });
}
