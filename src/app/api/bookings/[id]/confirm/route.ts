import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { bookingEvents, bookings } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { requireCustomerBooking } from "@/lib/booking-access";
import { hasOpenDispute, releaseProviderTransfer } from "@/lib/booking-workflow";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  let access;
  try { access = await requireCustomerBooking(id, user.id); }
  catch { return NextResponse.json({ error: "forbidden" }, { status: 403 }); }

  if (access.booking.status !== "provider_completed") {
    return NextResponse.json({ error: "service_not_waiting_for_confirmation" }, { status: 409 });
  }
  if (await hasOpenDispute(id)) return NextResponse.json({ error: "booking_has_open_dispute" }, { status: 409 });

  const now = new Date();
  const db = getDb();
  const [claimed] = await db.update(bookings).set({
    status: "customer_confirmed",
    customerConfirmedAt: now,
    payoutEligibleAt: now,
    updatedAt: now
  }).where(and(eq(bookings.id, id), eq(bookings.status, "provider_completed"))).returning();

  if (!claimed) return NextResponse.json({ error: "booking_changed" }, { status: 409 });
  await db.insert(bookingEvents).values({
    bookingId: id,
    actorUserId: user.id,
    eventType: "customer_confirmed_service",
    previousStatus: "provider_completed",
    nextStatus: "customer_confirmed"
  });

  try {
    await releaseProviderTransfer(id);
    return NextResponse.json({ ok: true, status: "paid_out" });
  } catch {
    // Confirmation is durable. A cron retry handles transient payout failures.
    return NextResponse.json({ ok: true, status: "customer_confirmed", payoutPending: true });
  }
}
