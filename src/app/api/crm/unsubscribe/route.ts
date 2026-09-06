import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { crmContacts } from "@/db/analytics-schema";
import { verifyUnsubscribeToken } from "@/lib/crm-email";

export const runtime = "nodejs";

async function unsubscribe(token: string) {
  const parsed = verifyUnsubscribeToken(token);
  if (!parsed) return false;
  const db = getDb();
  const [contact] = await db.select().from(crmContacts).where(eq(crmContacts.id, parsed.contactId)).limit(1);
  if (!contact || contact.email.toLowerCase() !== parsed.email.toLowerCase()) return false;
  await db.update(crmContacts).set({
    marketingConsent: false,
    unsubscribedAt: new Date(),
    lifecycle: contact.lifecycle === "suppressed" ? "suppressed" : contact.lifecycle,
    updatedAt: new Date()
  }).where(eq(crmContacts.id, contact.id));
  return true;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || "";
  const ok = await unsubscribe(token);
  return NextResponse.redirect(new URL(ok ? "/unsubscribe?status=done" : "/unsubscribe?status=invalid", request.url));
}

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || "";
  const ok = await unsubscribe(token);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
