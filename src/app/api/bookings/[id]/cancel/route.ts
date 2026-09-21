import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { bookingAccess } from "@/lib/booking-access";
import { POLICY_VERSION } from "@/lib/booking-workflow";
import { cancelBookingTransaction } from "@/lib/dispute-workflow";

const schema = z.object({ reason: z.string().trim().min(3).max(1000) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_cancellation" }, { status: 400 });

  const access = await bookingAccess(id, user.id);
  if (!access?.allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  try {
    const result = await cancelBookingTransaction({
      bookingId: id,
      actorUserId: user.id,
      actor: access.isProvider ? "provider" : "customer",
      reason: parsed.data.reason,
      policyVersion: POLICY_VERSION
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.error === "booking_not_found" ? 404 : 409 });
    }
    const pending = result.refundStatus === "pending" || result.refundStatus === "failed";
    return NextResponse.json({
      ...result,
      refundPending: result.refundStatus === "pending",
      refundRequiresReview: result.refundStatus === "failed"
    }, { status: pending ? 202 : 200 });
  } catch (error) {
    console.error("[VeroTask cancellation] transaction failed", error);
    return NextResponse.json({ error: "payment_service_unavailable" }, { status: 502 });
  }
}
