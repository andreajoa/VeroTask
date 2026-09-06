import { and, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { bookingEvents, bookings } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { requireProviderBooking } from "@/lib/booking-access";

const schema = z.object({ reason: z.string().trim().max(500).optional() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid_decline" }, { status: 400 });

  let access;
  try { access = await requireProviderBooking(id, user.id); }
  catch { return NextResponse.json({ error: "forbidden" }, { status: 403 }); }

  if (!["requested", "accepted"].includes(access.booking.status)) {
    return NextResponse.json({ error: "booking_cannot_be_declined" }, { status: 409 });
  }

  const db = getDb();
  const [updated] = await db.update(bookings).set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(bookings.id, id), inArray(bookings.status, ["requested", "accepted"])))
    .returning();
  if (!updated) return NextResponse.json({ error: "booking_state_changed" }, { status: 409 });

  await db.insert(bookingEvents).values({
    bookingId: id,
    actorUserId: user.id,
    eventType: "provider_declined",
    previousStatus: access.booking.status,
    nextStatus: "cancelled",
    metadata: { reason: parsed.data.reason ?? null, paymentCaptured: false }
  });

  return NextResponse.json({ ok: true, status: "cancelled" });
}
