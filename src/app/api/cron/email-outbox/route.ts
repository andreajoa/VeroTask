import { NextRequest, NextResponse } from "next/server";
import { processTransactionalEmailOutbox } from "@/lib/transactional-email-outbox";
import { authorizeEmailCron } from "@/lib/email-cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!await authorizeEmailCron(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const delivery = await processTransactionalEmailOutbox(100);
  return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), delivery });
}
