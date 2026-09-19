import { eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { getDb } from "@/db";
import { crmContacts, crmEmailEvents, crmEmailSends } from "@/db/analytics-schema";
import { verifyEmailTrackingToken } from "@/lib/crm-email";

const PIXEL = Buffer.from("R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=", "base64");

export async function GET(request: NextRequest) {
  const parsed = verifyEmailTrackingToken(request.nextUrl.searchParams.get("token") || "");
  if (parsed?.kind === "open") {
    try {
      const db = getDb();
      const [send] = await db.select().from(crmEmailSends).where(eq(crmEmailSends.id, parsed.sendId)).limit(1);
      if (send) {
        const inserted = await db.insert(crmEmailEvents).values({
          sendId: send.id,
          webhookEventId: `fp-open:${send.id}`,
          resendEmailId: send.resendEmailId,
          eventType: "email.opened",
          recipient: send.toEmail,
          metadata: { source: "verotask_first_party" },
          occurredAt: new Date()
        }).onConflictDoNothing().returning();
        if (inserted.length) {
          await db.update(crmContacts).set({ leadScore: sql`${crmContacts.leadScore} + 2`, updatedAt: new Date() }).where(eq(crmContacts.id, send.contactId));
        }
      }
    } catch {}
  }
  return new Response(PIXEL, {
    status: 200,
    headers: {
      "content-type": "image/gif",
      "content-length": String(PIXEL.length),
      "cache-control": "no-store, no-cache, must-revalidate",
      "x-content-type-options": "nosniff"
    }
  });
}
