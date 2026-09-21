import { and, eq, inArray } from "drizzle-orm";
import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTransactionalDb } from "@/db";
import { bookingEvents, bookings } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { requireProviderBooking } from "@/lib/booking-access";
import { canProviderDeclineBeforePayment } from "@/lib/booking-state";
import { kickTransactionalEmailOutbox, queueBookingEmail } from "@/lib/transactional-email-outbox";

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

  const updated = await getTransactionalDb().transaction(async (tx) => {
    const [next] = await tx.update(bookings).set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(bookings.id, id), inArray(bookings.status, ["requested", "accepted"])))
      .returning();
    if (!next) return null;

    await tx.insert(bookingEvents).values({
      bookingId: id,
      actorUserId: user.id,
      eventType: "provider_declined",
      previousStatus: access.booking.status,
      nextStatus: "cancelled",
      metadata: { reason: parsed.data.reason ?? null, paymentCaptured: false }
    });
    await queueBookingEmail(tx, {
      kind: "customer_request_declined",
      bookingId: id,
      idempotencyKey: `booking:${id}:customer-request-declined`
    });
    return next;
  });
  if (!updated) return NextResponse.json({ error: "booking_state_changed" }, { status: 409 });

  after(() => kickTransactionalEmailOutbox(id));

  return NextResponse.json({ ok: true, status: "cancelled" });
}
