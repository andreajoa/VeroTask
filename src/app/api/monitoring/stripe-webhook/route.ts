import { NextRequest, NextResponse } from "next/server";
import { authorizeCronToken, GITHUB_SCHEDULED_JOB_CREDENTIAL } from "@/lib/cron-token";
import { checkStripeWebhookLiveness } from "@/lib/stripe-webhook-liveness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Read-only, so it accepts the credential GitHub already holds as well as one
// dedicated to this monitor.
const ACCEPTED_CREDENTIALS = ["github_webhook_monitor_sha256", GITHUB_SCHEDULED_JOB_CREDENTIAL];

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  // Never access the database or reveal whether a cron token exists when the
  // caller did not present one. Neon outages must not turn 401 into HTTP 500.
  if (!authorization?.startsWith("Bearer ") || !authorization.slice(7).trim()) {
    return NextResponse.json({ error: "unauthorized" }, {
      status: 401, headers: { "cache-control": "no-store" }
    });
  }

  let authorized: boolean;
  try {
    authorized = await authorizeCronToken(authorization, ACCEPTED_CREDENTIALS);
  } catch {
    // A DB outage also prevents verifying hashed credentials. Report an
    // explicit unavailable result instead of leaking a stacktrace as HTTP 500.
    return NextResponse.json({ error: "authorization_backend_unavailable" }, {
      status: 503, headers: { "cache-control": "no-store" }
    });
  }
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, {
      status: 401, headers: { "cache-control": "no-store" }
    });
  }

  let liveness: Awaited<ReturnType<typeof checkStripeWebhookLiveness>>;
  try {
    liveness = await checkStripeWebhookLiveness();
  } catch {
    return NextResponse.json({ error: "monitor_database_unavailable" }, {
      status: 503, headers: { "cache-control": "no-store" }
    });
  }

  // 503 so a plain `curl --fail` alarms. Nothing is retried or repaired here:
  // once Stripe has skipped an event it will not resend it, and the booking
  // this protects is the one where the card was charged and the customer never
  // got the PIN. The only fix is at the Stripe endpoint configuration.
  return NextResponse.json(liveness, {
    status: liveness.healthy ? 200 : 503,
    headers: { "cache-control": "no-store" }
  });
}
