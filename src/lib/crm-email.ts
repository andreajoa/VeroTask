import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { deliverEmail, localEmailEnabled } from "@/lib/email-delivery";
import { getDb } from "@/db";
import { crmContacts, crmEmailSends } from "@/db/analytics-schema";
import { getEmailTemplate, renderVeroTaskEmail } from "@/lib/crm-templates";

function secret() {
  const value = process.env.UNSUBSCRIBE_SECRET || process.env.AUTH_SECRET;
  if (!value || value.length < 24) throw new Error("UNSUBSCRIBE_SECRET or AUTH_SECRET must be configured");
  return value;
}

export function unsubscribeToken(contactId: string, email: string) {
  const body = Buffer.from(JSON.stringify({ contactId, email: email.toLowerCase() })).toString("base64url");
  const signature = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyUnsubscribeToken(token: string) {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { contactId?: string; email?: string };
    return parsed.contactId && parsed.email ? { contactId: parsed.contactId, email: parsed.email } : null;
  } catch {
    return null;
  }
}

export async function sendCrmEmail(input: {
  contactId: string;
  templateKey: string;
  idempotencyKey: string;
  bookingId?: string | null;
  campaignId?: string | null;
  sequenceIndex?: number | null;
  actionUrl?: string;
  transactional?: boolean;
  subjectPrefix?: string;
}) {
  const db = getDb();
  const template = getEmailTemplate(input.templateKey);
  if (!template) throw new Error("unknown_email_template");

  const [contact] = await db.select().from(crmContacts).where(eq(crmContacts.id, input.contactId)).limit(1);
  if (!contact) throw new Error("crm_contact_not_found");

  const transactional = input.transactional ?? template.kind === "transactional";
  if (!transactional) {
    if (!contact.marketingConsent || contact.unsubscribedAt || contact.suppressionReason || contact.lifecycle === "suppressed") {
      return { skipped: true, reason: "not_marketable" as const };
    }
    if (process.env.NODE_ENV === "production" && !localEmailEnabled() && !process.env.MARKETING_POSTAL_ADDRESS) {
      throw new Error("MARKETING_POSTAL_ADDRESS is required for marketing email");
    }
  }

  const [existing] = await db.select().from(crmEmailSends).where(eq(crmEmailSends.idempotencyKey, input.idempotencyKey)).limit(1);
  if (existing?.status === "sending") return { skipped: true, reason: "in_progress" as const };
  if (existing && !["failed", "development_skipped", "queued"].includes(existing.status)) return { skipped: true, reason: "already_processed" as const, send: existing };

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://verotask.com").replace(/\/$/, "");
  const subject = `${input.subjectPrefix || ""}${template.subject}`;
  const token = unsubscribeToken(contact.id, contact.email);
  const unsubscribeUrl = `${appUrl}/api/crm/unsubscribe?token=${encodeURIComponent(token)}`;
  const html = renderVeroTaskEmail({
    template,
    firstName: contact.name?.split(/\s+/)[0] || null,
    actionUrl: input.actionUrl,
    unsubscribeUrl: transactional ? null : unsubscribeUrl,
    transactional
  });

  const [send] = await db.insert(crmEmailSends).values({
    contactId: contact.id,
    campaignId: input.campaignId,
    bookingId: input.bookingId,
    templateKey: template.key,
    toEmail: contact.email,
    subject,
    status: "queued",
    sequenceIndex: input.sequenceIndex,
    idempotencyKey: input.idempotencyKey
  }).onConflictDoUpdate({ target: crmEmailSends.idempotencyKey, set: { updatedAt: new Date() } }).returning();

  // A conditional claim prevents simultaneous cron requests from delivering twice.
  const [claimed] = await db.update(crmEmailSends).set({ status: "sending", updatedAt: new Date() })
    .where(and(eq(crmEmailSends.id, send.id), sql`${crmEmailSends.status} in ('queued', 'failed', 'development_skipped')`)).returning();
  if (!claimed) return { skipped: true, reason: "in_progress" as const };

  try {
    const delivered = await deliverEmail({
      to: contact.email, subject, html,
      idempotencyKey: input.idempotencyKey,
      headers: transactional ? undefined : { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      tags: [{ name: "template", value: template.key }, { name: "kind", value: template.kind }]
    });
    await db.update(crmEmailSends).set({ resendEmailId: delivered.local ? null : delivered.id, status: delivered.local ? "local_delivered" : "sent", sentAt: new Date(), updatedAt: new Date() }).where(eq(crmEmailSends.id, send.id));
    await db.update(crmContacts).set({ lastEmailAt: new Date(), updatedAt: new Date() }).where(eq(crmContacts.id, contact.id));
    return { skipped: false, sendId: send.id, resendEmailId: delivered.id };
  } catch (error) {
    await db.update(crmEmailSends).set({ status: "failed", updatedAt: new Date() }).where(eq(crmEmailSends.id, send.id));
    throw error;
  }
}

export async function marketableContacts(limit = 500) {
  const db = getDb();
  return db.select().from(crmContacts).where(and(
    eq(crmContacts.marketingConsent, true),
    isNull(crmContacts.unsubscribedAt),
    isNull(crmContacts.suppressionReason)
  )).limit(Math.min(1000, Math.max(1, limit)));
}
