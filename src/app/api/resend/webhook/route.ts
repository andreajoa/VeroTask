import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getDb } from "@/db";
import { crmContacts, crmEmailEvents, crmEmailSends, platformSecrets } from "@/db/analytics-schema";

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

async function resendWebhookSecret() {
  if (process.env.RESEND_WEBHOOK_SECRET) return process.env.RESEND_WEBHOOK_SECRET;
  try {
    const [stored] = await getDb()
      .select({ value: platformSecrets.secretValue })
      .from(platformSecrets)
      .where(eq(platformSecrets.id, "resend_webhook_secret"))
      .limit(1);
    return stored?.value || null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });

  const payload = await request.text();
  const webhookEventId = request.headers.get("svix-id") || "";
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  const webhookSecret = await resendWebhookSecret();
  if (!webhookSecret || !webhookEventId || !timestamp || !signature) return NextResponse.json({ error: "missing_signature" }, { status: 400 });

  let verified: ResendEvent;
  try {
    const resend = new Resend(apiKey);
    verified = await Promise.resolve(resend.webhooks.verify({
      payload,
      headers: { id: webhookEventId, timestamp, signature },
      webhookSecret
    })) as unknown as ResendEvent;
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
  let engagementAlreadyRecorded = false;
  if (send && ["email.opened", "email.clicked"].includes(eventType)) {
    const [existingEngagement] = await db.select({ id: crmEmailEvents.id }).from(crmEmailEvents).where(and(
      eq(crmEmailEvents.sendId, send.id),
      eq(crmEmailEvents.eventType, eventType)
    )).limit(1);
    engagementAlreadyRecorded = Boolean(existingEngagement);
  }

  const inserted = await db.insert(crmEmailEvents).values({
    sendId: send?.id,
    webhookEventId,
    resendEmailId: emailId,
    eventType,
    recipient,
    metadata: verified.data ?? {},
    occurredAt
  }).onConflictDoNothing().returning();
  if (!inserted.length) return NextResponse.json({ received: true, duplicate: true });

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

    if (eventType === "email.opened" && !engagementAlreadyRecorded) {
      await db.update(crmContacts).set({ leadScore: sql`${crmContacts.leadScore} + 2`, updatedAt: new Date() }).where(eq(crmContacts.id, send.contactId));
    } else if (eventType === "email.clicked" && !engagementAlreadyRecorded) {
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
