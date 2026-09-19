import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { crmContacts } from "@/db/analytics-schema";
import { getCurrentUser } from "@/lib/auth";
import { sendCrmEmail } from "@/lib/crm-email";
import { requestGeo } from "@/lib/visitor-privacy";

const schema = z.object({
  email: z.string().trim().email().max(320),
  name: z.string().trim().max(180).optional(),
  audience: z.enum(["customer", "pro", "both"]),
  marketingConsent: z.literal(true)
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid_interest" }, { status: 400 });

  const email = parsed.data.email.toLowerCase();
  const db = getDb();
  const user = await getCurrentUser();
  const geo = requestGeo(request.headers);
  const [existing] = await db.select().from(crmContacts).where(eq(crmContacts.email, email)).limit(1);
  const tag = `interest:${parsed.data.audience}`;
  const tags = Array.from(new Set([...(existing?.tags ?? []), tag, "interest-popup"]));

  let contact;
  if (existing) {
    [contact] = await db.update(crmContacts).set({
      userId: existing.userId ?? (user?.email.toLowerCase() === email ? user.id : null),
      name: parsed.data.name || existing.name,
      marketingConsent: true,
      consentCapturedAt: new Date(),
      consentSource: "interest_popup",
      countryCode: geo.countryCode ?? existing.countryCode,
      region: geo.region ?? existing.region,
      city: geo.city ?? existing.city,
      tags,
      lastSeenAt: new Date(),
      updatedAt: new Date()
    }).where(eq(crmContacts.id, existing.id)).returning();
  } else {
    [contact] = await db.insert(crmContacts).values({
      userId: user?.email.toLowerCase() === email ? user.id : null,
      email,
      name: parsed.data.name || null,
      lifecycle: "lead",
      marketingConsent: true,
      consentCapturedAt: new Date(),
      consentSource: "interest_popup",
      countryCode: geo.countryCode,
      region: geo.region,
      city: geo.city,
      tags,
      lastSeenAt: new Date()
    }).returning();
  }

  const templateKey = parsed.data.audience === "pro" ? "pro-intro-orlando" : "customer-intro-orlando";
  try {
    await sendCrmEmail({
      contactId: contact.id,
      templateKey,
      idempotencyKey: `interest-welcome:${contact.id}:${parsed.data.audience}`
    });
  } catch (error) {
    console.error("[VeroTask interest popup welcome]", error);
  }

  return NextResponse.json({ ok: true });
}
