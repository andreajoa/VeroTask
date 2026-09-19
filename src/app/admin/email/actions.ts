"use server";

import { randomUUID } from "node:crypto";
import { addHours } from "date-fns";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { sendCrmEmail } from "@/lib/crm-email";
import { getDb } from "@/db";
import { crmCampaigns, crmContacts } from "@/db/analytics-schema";
import { isAdminSession } from "@/lib/admin-auth";
import { canonicalAppUrl } from "@/lib/app-url";
import { EMAIL_TEMPLATES, getEmailTemplate } from "@/lib/crm-templates";

async function requireAdmin() {
  if (!(await isAdminSession())) redirect("/admin/signin");
}

export async function scheduleCampaign(formData: FormData) {
  await requireAdmin();
  const templateKey = String(formData.get("templateKey") || "");
  const template = getEmailTemplate(templateKey);
  if (!template || template.kind !== "marketing") redirect("/admin/email?error=invalid-template");
  const segment = String(formData.get("segment") || "all_marketable").slice(0, 160);
  if (!["all_marketable", "customers", "providers", "lapsed_customers"].includes(segment) && !/^(city|country):[\p{L} .'-]{2,120}$/u.test(segment)) redirect("/admin/email?error=invalid-segment");
  const scheduledInput = String(formData.get("scheduledAt") || "");
  const scheduledAt = scheduledInput ? new Date(scheduledInput) : new Date();
  if (Number.isNaN(scheduledAt.getTime())) redirect("/admin/email?error=invalid-date");

  const db = getDb();
  await db.insert(crmCampaigns).values({
    key: `${template.key}-${randomUUID()}`,
    name: template.heading,
    subject: template.subject,
    previewText: template.preview,
    templateKey: template.key,
    segment,
    status: "scheduled",
    scheduledAt,
    createdBy: "password-admin"
  });
  redirect("/admin/email?notice=scheduled");
}

export async function sendTestEmail(formData: FormData) {
  await requireAdmin();
  const templateKey = String(formData.get("templateKey") || "");
  const to = String(formData.get("email") || "").trim().toLowerCase();
  const template = getEmailTemplate(templateKey);
  if (!template || !/^\S+@\S+\.\S+$/.test(to)) redirect("/admin/email?error=invalid-test");
  const appUrl = canonicalAppUrl();
  let failed = false;
  try {
    const [contact] = await getDb().insert(crmContacts).values({ email: to, tags: ["admin-test"] })
      .onConflictDoUpdate({ target: crmContacts.email, set: { updatedAt: new Date() } }).returning();
    await sendCrmEmail({ contactId: contact.id, templateKey, idempotencyKey: `admin-test:${randomUUID()}`, subjectPrefix: "[TEST] ", actionUrl: `${appUrl}${template.ctaPath}`, transactional: true });
  } catch { failed = true; }
  if (failed) redirect("/admin/email?error=email-unavailable");
  redirect("/admin/email?notice=test-sent");
}

export async function seedMarketingCampaigns() {
  await requireAdmin();
  const db = getDb();
  const templates = EMAIL_TEMPLATES.filter((template) => template.kind === "marketing");
  for (const template of templates) {
    await db.insert(crmCampaigns).values({
      key: `library-${template.key}`,
      name: template.heading,
      subject: template.subject,
      previewText: template.preview,
      templateKey: template.key,
      segment: template.audience === "all_marketable" ? "all_marketable" : template.audience,
      status: "draft",
      createdBy: "system-library"
    }).onConflictDoNothing();
  }
  redirect("/admin/email?notice=library-seeded");
}
export async function scheduleNonOpenerFollowUp(formData: FormData) {
  await requireAdmin();
  const campaignId = String(formData.get("campaignId") || "");
  const templateKey = String(formData.get("templateKey") || "");
  const hours = Number(formData.get("hours") || 48);
  const template = getEmailTemplate(templateKey);
  if (!/^[0-9a-f-]{36}$/i.test(campaignId) || !template || template.kind !== "marketing" || ![24, 48, 72, 120, 168].includes(hours)) {
    redirect("/admin/email?error=invalid-follow-up");
  }

  const db = getDb();
  const [source] = await db.select().from(crmCampaigns).where(eq(crmCampaigns.id, campaignId)).limit(1);
  if (!source || !["sent", "sending"].includes(source.status)) redirect(`/admin/email/campaigns/${campaignId}?error=campaign-not-sent`);

  await db.insert(crmCampaigns).values({
    key: `follow-up-${campaignId}-${template.key}-${randomUUID()}`,
    name: `Follow-up · ${template.heading}`,
    subject: template.subject,
    previewText: template.preview,
    templateKey: template.key,
    segment: `non_openers:${campaignId}`,
    status: "scheduled",
    scheduledAt: addHours(new Date(), hours),
    createdBy: "password-admin"
  });
  redirect(`/admin/email/campaigns/${campaignId}?notice=follow-up-scheduled`);
}
