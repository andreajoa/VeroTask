import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { bookingEvents, bookings, disputes, providerTransfers } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { refundBookingPayment, releaseProviderTransfer, reverseProviderTransfer } from "@/lib/booking-workflow";
import { restoreBookingRewardCredit } from "@/lib/rewards";

const schema = z.object({
  outcome: z.enum(["customer", "provider", "split"]),
  refundCents: z.number().int().nonnegative(),
  providerCents: z.number().int().nonnegative(),
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

  if (parsed.data.refundCents > booking.subtotalCents || parsed.data.providerCents > booking.providerAmountCents) {
    return NextResponse.json({ error: "resolution_exceeds_booking_amounts" }, { status: 400 });
  }
  if (parsed.data.refundCents + parsed.data.providerCents > booking.subtotalCents) {
    return NextResponse.json({ error: "resolution_total_invalid" }, { status: 400 });
  }
  if (parsed.data.outcome === "customer" && parsed.data.refundCents === 0) return NextResponse.json({ error: "customer_outcome_requires_refund" }, { status: 400 });
  if (parsed.data.outcome === "provider" && parsed.data.providerCents === 0) return NextResponse.json({ error: "provider_outcome_requires_payment" }, { status: 400 });

  const [paidTransfer] = await db.select().from(providerTransfers).where(eq(providerTransfers.bookingId, booking.id)).limit(1);
  if (paidTransfer?.status === "paid" && paidTransfer.amountCents > parsed.data.providerCents) {
    await reverseProviderTransfer(booking.id, paidTransfer.amountCents - parsed.data.providerCents);
  }

  if (parsed.data.refundCents > 0) {
    await refundBookingPayment({
      bookingId: booking.id,
      amountCents: parsed.data.refundCents,
      reason: `dispute_resolution_${parsed.data.outcome}`,
      disputeId: dispute.id
    });
  }

  const fullRefund = parsed.data.refundCents === booking.subtotalCents;
  const rewardsRestoredCents = fullRefund ? await restoreBookingRewardCredit(booking.id) : 0;
  const disputeStatus = parsed.data.outcome === "customer"
    ? "resolved_customer"
    : parsed.data.outcome === "provider" ? "resolved_provider" : "resolved_split";
  const now = new Date();
  await db.update(disputes).set({
    status: disputeStatus,
    resolutionRefundCents: parsed.data.refundCents,
    resolutionProviderCents: parsed.data.providerCents,
    resolutionNote: parsed.data.note,
    resolvedAt: now
  }).where(eq(disputes.id, dispute.id));

  await db.update(bookings).set({
    status: fullRefund ? "refunded" : "customer_confirmed",
    payoutEligibleAt: parsed.data.providerCents > 0 ? now : null,
    updatedAt: now
  }).where(eq(bookings.id, booking.id));
  await db.insert(bookingEvents).values({
    bookingId: booking.id,
    actorUserId: user.id,
    eventType: "dispute_resolved",
    previousStatus: "disputed",
    nextStatus: fullRefund ? "refunded" : "customer_confirmed",
    metadata: {
      disputeId: dispute.id,
      outcome: parsed.data.outcome,
      refundCents: parsed.data.refundCents,
      rewardsRestoredCents,
      providerCents: parsed.data.providerCents,
      note: parsed.data.note
    }
  });

  let payoutPending = false;
  if (parsed.data.providerCents > 0) {
    try { await releaseProviderTransfer(booking.id, parsed.data.providerCents); }
    catch { payoutPending = true; }
  }

  return NextResponse.json({
    ok: true,
    disputeStatus,
    refundCents: parsed.data.refundCents,
    rewardsRestoredCents,
    providerCents: parsed.data.providerCents,
    payoutPending
  });
}
