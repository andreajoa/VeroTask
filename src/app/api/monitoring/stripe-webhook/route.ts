import { NextRequest, NextResponse } from "next/server";
import { authorizeCronToken, hashedCronCredentialExists } from "@/lib/cron-token";
import { checkStripeWebhookLiveness } from "@/lib/stripe-webhook-liveness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!await authorizeCronToken(request.headers.get("authorization"), "github_webhook_monitor_sha256")) {
    // Whether the credential was never provisioned in *this* deployment's
    // database is the difference between a wrong token and a monitor wired to
    // the wrong environment. Saying so leaks nothing and saves an hour.
    const credentialProvisioned = await hashedCronCredentialExists("github_webhook_monitor_sha256");
    return NextResponse.json({ error: "unauthorized", credentialProvisioned }, { status: 401 });
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
