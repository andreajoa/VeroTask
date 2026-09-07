"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { crmContacts } from "@/db/analytics-schema";
import { getCurrentUser } from "@/lib/auth";
import { ensureCrmContactForUser } from "@/lib/crm-automation";

export async function saveProfile(form: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/dashboard/profile");
  const parsed = z.object({ name: z.string().trim().min(2).max(180), phone: z.string().trim().max(32), locale: z.enum(["en-US", "pt-BR", "es-US"]) }).safeParse({ name: form.get("name"), phone: form.get("phone"), locale: form.get("locale") });
  if (!parsed.success) redirect("/dashboard/profile?error=invalid");
  const db = getDb();
  await db.update(users).set({ ...parsed.data, updatedAt: new Date() }).where(eq(users.id, user.id));
  const contact = await ensureCrmContactForUser(user.id);
  const marketingConsent = form.get("marketingConsent") === "on";
  if (contact) await db.update(crmContacts).set({
    marketingConsent: marketingConsent && !contact.suppressionReason,
    consentCapturedAt: new Date(), consentSource: "account_preferences",
    unsubscribedAt: marketingConsent ? null : new Date(), updatedAt: new Date()
  }).where(eq(crmContacts.id, contact.id));
  redirect("/dashboard/profile?notice=saved");
}
