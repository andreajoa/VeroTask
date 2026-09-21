import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/admin-auth";
import { getCurrentUser } from "@/lib/auth";
import { disputeAdminActor, resolveBookingDispute } from "@/lib/dispute-workflow";

const schema = z.object({
  outcome: z.enum(["customer", "provider", "split"]),
  refundCents: z.number().int().nonnegative(),
  note: z.string().trim().min(10).max(5000)
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const actor = disputeAdminActor(user, user && ["admin", "support"].includes(user.role) ? false : await isAdminSession());
  if (!actor.allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_resolution" }, { status: 400 });

  try {
    const result = await resolveBookingDispute({
      disputeId: id,
      actorUserId: actor.actorUserId,
      ...parsed.data
    });
    if (!result.ok) {
      const status = result.error === "dispute_not_open" || result.error === "booking_not_found" ? 404
        : result.error === "refund_pending" || result.error === "refund_failed_requires_review" || result.error === "refund_request_conflict" ? 409
          : 400;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("[VeroTask dispute resolution] transaction failed", error);
    return NextResponse.json({ error: "resolution_service_unavailable" }, { status: 502 });
  }
}
