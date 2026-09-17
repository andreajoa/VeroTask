import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { bookingEvents, bookings, disputes } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { refundBookingPayment } from "@/lib/booking-workflow";

const schema = z.object({
  outcome: z.enum(["customer", "provider", "split"]),
  refundCents: z.number().int().nonnegative(),
  note: z.string().trim().min(10).max(5000)
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !["admin", "support"].includes(user.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_resolution" }, { status: 400 });

  const db = getDb();
  const [dispute] = await db.select().from(disputes).where(eq(disputes.id, id)).limit(1);
  if (!dispute || dispute.resolvedAt) return NextResponse.json({ error: "dispute_not_open" }, { status: 404 });
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, dispute.bookingId)).limit(1);
  if (!booking) return NextResponse.json({ error: "booking_not_found" }, { status: 404 });

  const maxRefund = booking.marketplaceFeeCents;
  if (parsed.data.refundCents > maxRefund) {
    return NextResponse.json({ error: "refund_exceeds_verotask_booking_fee" }, { status: 400 });
  }
  if (parsed.data.outcome === "customer" && parsed.data.refundCents === 0) return NextResponse.json({ error: "customer_outcome_requires_refund" }, { status: 400 });
  if (parsed.data.outcome === "provider" && parsed.data.refundCents !== 0) return NextResponse.json({ error: "provider_outcome_requires_zero_refund" }, { status: 400 });
  if (parsed.data.outcome === "split" && (parsed.data.refundCents <= 0 || parsed.data.refundCents >= maxRefund)) {
    return NextResponse.json({ error: "split_outcome_requires_partial_booking_fee_refund" }, { status: 400 });
  }

  if (parsed.data.refundCents > 0) {
    await refundBookingPayment({
      bookingId: booking.id,
      amountCents: parsed.data.refundCents,
      reason: `dispute_resolution_${parsed.data.outcome}`,
      disputeId: dispute.id
    });
  }

  const disputeStatus = parsed.data.outcome === "customer"
    ? "resolved_customer"
    : parsed.data.outcome === "provider" ? "resolved_provider" : "resolved_split";
  const now = new Date();
  await db.update(disputes).set({
    status: disputeStatus,
    resolutionRefundCents: parsed.data.refundCents,
    resolutionProviderCents: 0,
    resolutionNote: parsed.data.note,
    resolvedAt: now
  }).where(eq(disputes.id, dispute.id));

  const fullBookingFeeRefund = maxRefund > 0 && parsed.data.refundCents === maxRefund;
  const nextStatus = fullBookingFeeRefund ? "refunded" : "customer_confirmed";
  await db.update(bookings).set({
    status: nextStatus,
    payoutEligibleAt: null,
    updatedAt: now
  }).where(eq(bookings.id, booking.id));
  await db.insert(bookingEvents).values({
    bookingId: booking.id,
    actorUserId: user.id,
    eventType: "dispute_resolved",
    previousStatus: "disputed",
    nextStatus,
    metadata: {
      disputeId: dispute.id,
      outcome: parsed.data.outcome,
      bookingFeeRefundCents: parsed.data.refundCents,
      providerCents: 0,
      servicePaymentHandledDirectly: true,
      note: parsed.data.note
    }
  });

  return NextResponse.json({ ok: true, disputeStatus, refundCents: parsed.data.refundCents, providerCents: 0, payoutPending: false });
}
