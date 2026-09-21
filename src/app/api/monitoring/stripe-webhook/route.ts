import { NextRequest, NextResponse } from "next/server";
import { authorizeCronToken, GITHUB_SCHEDULED_JOB_CREDENTIAL, hashedCronCredentialExists } from "@/lib/cron-token";
import { checkStripeWebhookLiveness } from "@/lib/stripe-webhook-liveness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Read-only, so it accepts the credential GitHub already holds as well as one
// dedicated to this monitor.
const ACCEPTED_CREDENTIALS = ["github_webhook_monitor_sha256", GITHUB_SCHEDULED_JOB_CREDENTIAL];

export async function GET(request: NextRequest) {
  if (!await authorizeCronToken(request.headers.get("authorization"), ACCEPTED_CREDENTIALS)) {
    // Whether any credential was provisioned in *this* deployment's database is
    // the difference between a wrong token and a monitor wired to the wrong
    // environment. Saying so leaks nothing and saves an hour.
    const credentialProvisioned = await hashedCronCredentialExists(ACCEPTED_CREDENTIALS);
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
