import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { bookingAccess } from "@/lib/booking-access";
import { POLICY_VERSION } from "@/lib/booking-workflow";
import { openBookingDispute } from "@/lib/dispute-workflow";

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

  // VeroTask can review/refund only the booking fee collected by Stripe. Any
  // service-price dispute remains between the customer and the professional.
  const result = await openBookingDispute({
    bookingId: id,
    actorUserId: user.id,
    reason: parsed.data.reason,
    summary: parsed.data.summary,
    requestedRefundCents: parsed.data.requestedRefundCents,
    isCustomer: access.isCustomer,
    isProvider: access.isProvider,
    policyVersion: POLICY_VERSION
  });
  if (!result.ok) {
    const status = result.error === "booking_not_found" ? 404
      : result.error === "provider_reason_only" || result.error === "customer_reason_only" ? 403 : 409;
    return NextResponse.json({
      error: result.error,
      ...(result.error === "dispute_already_open" ? { disputeId: result.disputeId } : {}),
      ...(result.error === "provider_arrival_already_verified" ? { bookingFeeRefundAvailableForNoShow: false } : {})
    }, { status });
  }

  return NextResponse.json(result);
}
