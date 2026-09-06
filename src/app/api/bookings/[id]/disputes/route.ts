import { and, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { bookingEvents, bookings, disputes } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { bookingAccess } from "@/lib/booking-access";
import { POLICY_VERSION } from "@/lib/booking-workflow";

const schema = z.object({
  reason: z.enum(["provider_no_show", "service_not_completed", "service_not_as_described", "property_damage", "customer_no_show", "payment_issue", "other"]),
  summary: z.string().trim().min(10).max(5000),
  requestedRefundCents: z.number().int().nonnegative().optional()
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_dispute" }, { status: 400 });

  const access = await bookingAccess(id, user.id);
  if (!access?.allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (parsed.data.reason === "customer_no_show" && !access.isProvider) return NextResponse.json({ error: "provider_reason_only" }, { status: 403 });
  if (parsed.data.reason === "provider_no_show" && !access.isCustomer) return NextResponse.json({ error: "customer_reason_only" }, { status: 403 });

  const now = Date.now();
  const serviceEnd = (access.booking.scheduledEnd ?? access.booking.scheduledStart).getTime();
  const canOpen = ["scheduled", "in_progress", "provider_completed", "customer_confirmed", "auto_completed", "paid_out"].includes(access.booking.status);
  if (!canOpen) return NextResponse.json({ error: "dispute_not_available" }, { status: 409 });
  if (access.booking.status === "scheduled" && now < serviceEnd && parsed.data.reason === "provider_no_show") {
    return NextResponse.json({ error: "service_window_not_finished" }, { status: 409 });
  }
  // Internal resolution remains available for 72 hours after the scheduled end.
  // Card-network chargeback rights are separate and are not limited by this value.
  if (now > serviceEnd + 72 * 60 * 60 * 1000) return NextResponse.json({ error: "internal_dispute_window_closed" }, { status: 409 });

  const db = getDb();
  const [open] = await db.select({ id: disputes.id }).from(disputes)
    .where(and(eq(disputes.bookingId, id), isNull(disputes.resolvedAt))).limit(1);
  if (open) return NextResponse.json({ error: "dispute_already_open", disputeId: open.id }, { status: 409 });

  const requested = Math.min(parsed.data.requestedRefundCents ?? access.booking.subtotalCents, access.booking.subtotalCents);
  const [dispute] = await db.insert(disputes).values({
    bookingId: id,
    openedByUserId: user.id,
    reason: parsed.data.reason,
    summary: parsed.data.summary,
    customerRequestedRefundCents: access.isCustomer ? requested : undefined,
    status: "open"
  }).returning();

  await db.update(bookings).set({ status: "disputed", updatedAt: new Date() }).where(eq(bookings.id, id));
  await db.insert(bookingEvents).values({
    bookingId: id,
    actorUserId: user.id,
    eventType: "dispute_opened",
    previousStatus: access.booking.status,
    nextStatus: "disputed",
    metadata: { disputeId: dispute.id, reason: dispute.reason, policyVersion: POLICY_VERSION }
  });

  return NextResponse.json({ ok: true, disputeId: dispute.id, status: "disputed" });
}
