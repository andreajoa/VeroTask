import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { crmContacts, crmEmailEvents, crmEmailSends } from "@/db/analytics-schema";
import { canonicalAppUrl } from "@/lib/app-url";
import { verifyEmailTrackingToken } from "@/lib/crm-email";

export async function GET(request: NextRequest) {
  const appUrl = canonicalAppUrl();
  const parsed = verifyEmailTrackingToken(request.nextUrl.searchParams.get("token") || "");
  let target = appUrl;
  if (parsed?.kind === "click" && parsed.target) {
    try {
      const candidate = new URL(parsed.target, appUrl);
      if (candidate.origin === new URL(appUrl).origin) target = candidate.toString();
    } catch {}
    try {
      const db = getDb();
      const [send] = await db.select().from(crmEmailSends).where(eq(crmEmailSends.id, parsed.sendId)).limit(1);
      if (send) {
        const inserted = await db.insert(crmEmailEvents).values({
          sendId: send.id,
          webhookEventId: `fp-click:${send.id}`,
          resendEmailId: send.resendEmailId,
          eventType: "email.clicked",
          recipient: send.toEmail,
          metadata: { source: "verotask_first_party", target },
          occurredAt: new Date()
        }).onConflictDoNothing().returning();
        if (inserted.length) {
          await db.update(crmContacts).set({ leadScore: sql`${crmContacts.leadScore} + 5`, updatedAt: new Date() }).where(eq(crmContacts.id, send.contactId));
        }
      }
    } catch {}
  }
  return NextResponse.redirect(target, { status: 302 });
}
