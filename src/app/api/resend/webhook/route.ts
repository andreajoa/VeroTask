import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getDb } from "@/db";
import { crmContacts, crmEmailEvents, crmEmailSends } from "@/db/analytics-schema";

export const runtime = "nodejs";

type ResendEvent = {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string[];
    subject?: string;
    [key: string]: unknown;
  };
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!apiKey || !webhookSecret) return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });

  const payload = await request.text();
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  if (!id || !timestamp || !signature) return NextResponse.json({ error: "missing_signature" }, { status: 400 });

  let verified: ResendEvent;
  try {
    const resend = new Resend(apiKey);
    verified = await Promise.resolve(resend.webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret
    })) as ResendEvent;
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const eventType = verified.type || "unknown";
  const emailId = verified.data?.email_id || null;
  const recipient = verified.data?.to?.[0] || null;
  const occurredAt = verified.created_at ? new Date(verified.created_at) : new Date();
  const db = getDb();

  let send: typeof crmEmailSends.$inferSelect | undefined;
  if (emailId) [send] = await db.select().from(crmEmailSends).where(eq(crmEmailSends.resendEmailId, emailId)).limit(1);

  await db.insert(crmEmailEvents).values({
    sendId: send?.id,
    webhookEventId: id,
    resendEmailId: emailId,
    eventType,
    recipient,
    metadata: verified.data ?? {},
    occurredAt
  }).onConflictDoNothing();

  if (send) {
    const statusMap: Record<string, string> = {
      "email.sent": "sent",
      "email.delivered": "delivered",
      "email.delivery_delayed": "delayed",
      "email.opened": "opened",
      "email.clicked": "clicked",
      "email.bounced": "bounced",
      "email.complained": "complained",
      "email.failed": "failed",
      "email.suppressed": "suppressed"
    };
    const status = statusMap[eventType];
    if (status) await db.update(crmEmailSends).set({ status, updatedAt: new Date() }).where(eq(crmEmailSends.id, send.id));

    if (eventType === "email.opened") {
      await db.update(crmContacts).set({ leadScore: sql`${crmContacts.leadScore} + 2`, updatedAt: new Date() }).where(eq(crmContacts.id, send.contactId));
    } else if (eventType === "email.clicked") {
      await db.update(crmContacts).set({ leadScore: sql`${crmContacts.leadScore} + 5`, updatedAt: new Date() }).where(eq(crmContacts.id, send.contactId));
    } else if (["email.bounced", "email.complained", "email.suppressed"].includes(eventType)) {
      await db.update(crmContacts).set({
        lifecycle: "suppressed",
        marketingConsent: false,
        suppressionReason: eventType,
        updatedAt: new Date()
      }).where(eq(crmContacts.id, send.contactId));
    }
  }

  return NextResponse.json({ received: true });
}
