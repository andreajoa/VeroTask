import { NextRequest, NextResponse } from "next/server";
import { runCrmAutomations } from "@/lib/crm-automation";
import { retryEligibleProviderTransfers } from "@/lib/payout-retry";
import { sendProtectionReminders } from "@/lib/protection-reminders";
import { autoSettleExpiredBookings } from "@/lib/settlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [settlements, payoutRetries, reminders, crm] = await Promise.all([
    autoSettleExpiredBookings(75),
    retryEligibleProviderTransfers(75),
    sendProtectionReminders(75),
    runCrmAutomations(100)
  ]);

  return NextResponse.json({
    ok: true,
    ranAt: new Date().toISOString(),
    settlements,
    payoutRetries,
    reminders,
    crm
  });
}
