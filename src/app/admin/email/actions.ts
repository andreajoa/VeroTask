"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { Resend } from "resend";
import { getDb } from "@/db";
import { crmCampaigns } from "@/db/analytics-schema";
import { isAdminSession } from "@/lib/admin-auth";
import { EMAIL_TEMPLATES, getEmailTemplate, renderVeroTaskEmail } from "@/lib/crm-templates";

async function requireAdmin() {
  if (!(await isAdminSession())) redirect("/admin/signin");
}

export async function scheduleCampaign(formData: FormData) {
  await requireAdmin();
  const templateKey = String(formData.get("templateKey") || "");
  const template = getEmailTemplate(templateKey);
  if (!template || template.kind !== "marketing") redirect("/admin/email?error=invalid-template");
  const segment = String(formData.get("segment") || "all_marketable").slice(0, 160);
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
  const key = process.env.RESEND_API_KEY;
  if (!key) redirect("/admin/email?error=resend-not-configured");
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://verotask.com").replace(/\/$/, "");
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "VeroTask <notifications@verotask.com>",
    to,
    subject: `[TEST] ${template.subject}`,
    html: renderVeroTaskEmail({ template, firstName: "Test", actionUrl: `${appUrl}${template.ctaPath}`, transactional: true }),
    tags: [{ name: "template", value: template.key }, { name: "kind", value: "admin-test" }]
  });
  if (error) redirect(`/admin/email?error=${encodeURIComponent(error.message.slice(0, 80))}`);
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
