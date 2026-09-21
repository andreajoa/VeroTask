import { NextRequest, NextResponse } from "next/server";
import { authorizeCronToken } from "@/lib/cron-token";
import { checkStripeWebhookLiveness } from "@/lib/stripe-webhook-liveness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!await authorizeCronToken(request.headers.get("authorization"), "github_webhook_monitor_sha256")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const liveness = await checkStripeWebhookLiveness();

  // 503 so a plain `curl --fail` alarms. Nothing is retried or repaired here:
  // once Stripe has skipped an event it will not resend it, and the booking
  // this protects is the one where the card was charged and the customer never
  // got the PIN. The only fix is at the Stripe endpoint configuration.
  return NextResponse.json(liveness, {
    status: liveness.healthy ? 200 : 503,
    headers: { "cache-control": "no-store" }
  });
}
