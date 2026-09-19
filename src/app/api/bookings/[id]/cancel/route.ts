import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { bookingCheckoutSessions } from "@/db/operations-schema";
import { bookingEvents, bookings } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { bookingAccess } from "@/lib/booking-access";
import { POLICY_VERSION, refundBookingPayment } from "@/lib/booking-workflow";
import { getStripe } from "@/lib/stripe";

const schema = z.object({ reason: z.string().trim().min(3).max(1000) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_cancellation" }, { status: 400 });

  const access = await bookingAccess(id, user.id);
  if (!access?.allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!["requested", "accepted", "payment_authorized", "scheduled"].includes(access.booking.status)) {
    return NextResponse.json({ error: "booking_cannot_be_cancelled" }, { status: 409 });
  }

  const db = getDb();
  const paymentCaptured = Boolean(access.booking.stripePaymentIntentId);

  // If payment has not been captured, invalidate any still-open Checkout Session
  // before cancelling. This prevents a stale booking-fee payment after cancellation.
  if (!paymentCaptured) {
    const [checkout] = await db.select().from(bookingCheckoutSessions)
      .where(eq(bookingCheckoutSessions.bookingId, id)).limit(1);
    if (checkout?.status === "open") {
      try {
        const stripe = getStripe();
        const session = await stripe.checkout.sessions.retrieve(checkout.stripeSessionId);
        if (session.status === "complete") {
          return NextResponse.json({ error: "payment_confirmation_pending" }, { status: 409 });
        }
        if (session.status === "open") {
          await stripe.checkout.sessions.expire(checkout.stripeSessionId);
        }
        await db.update(bookingCheckoutSessions)
          .set({ status: "expired", updatedAt: new Date() })
          .where(and(eq(bookingCheckoutSessions.id, checkout.id), eq(bookingCheckoutSessions.status, "open")));
      } catch (error) {
        console.error("[VeroTask cancellation] failed to expire checkout session", error);
        return NextResponse.json({ error: "payment_service_unavailable" }, { status: 502 });
      }
    }
  }

  let refundCents = 0;
  let rule = "unpaid_cancellation";

  // VeroTask can refund only the booking fee it actually collected. The service
  // price is paid directly between customer and professional.
  if (access.isProvider) {
    refundCents = paymentCaptured ? access.booking.marketplaceFeeCents : 0;
    rule = paymentCaptured ? "provider_cancelled_booking_fee_refund" : "provider_cancelled_before_payment";
  } else if (paymentCaptured) {
    const hoursUntilStart = (access.booking.scheduledStart.getTime() - Date.now()) / 3_600_000;
    if (hoursUntilStart > 24) {
      refundCents = access.booking.marketplaceFeeCents;
      rule = "customer_cancelled_over_24h_booking_fee_refund";
    } else if (hoursUntilStart >= 6) {
      refundCents = Math.round(access.booking.marketplaceFeeCents * 0.5);
      rule = "customer_cancelled_6_to_24h_half_booking_fee_refund";
    } else {
      rule = "customer_cancelled_under_6h_booking_fee_nonrefundable";
    }
  } else if (access.booking.status === "accepted" || access.booking.status === "payment_authorized") {
    rule = "customer_cancelled_before_payment";
  }

  if (refundCents > 0) {
    await refundBookingPayment({ bookingId: id, amountCents: refundCents, reason: rule });
  }

  const nextStatus = paymentCaptured && refundCents === access.booking.marketplaceFeeCents ? "refunded" : "cancelled";
  await db.update(bookings).set({ status: nextStatus, payoutEligibleAt: null, updatedAt: new Date() }).where(eq(bookings.id, id));
  await db.insert(bookingEvents).values({
    bookingId: id,
    actorUserId: user.id,
    eventType: "booking_cancelled",
    previousStatus: access.booking.status,
    nextStatus,
    metadata: {
      cancelledBy: access.isProvider ? "provider" : "customer",
      reason: parsed.data.reason,
      policyRule: rule,
      policyVersion: POLICY_VERSION,
      refundCents,
      refundableAsset: "verotask_booking_fee",
      servicePaymentHandledDirectly: true
    }
  });

  return NextResponse.json({ ok: true, status: nextStatus, refundCents, providerCompensationCents: 0, policyRule: rule });
}
