import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { analyticsEvents, crmContacts, visitorSessions } from "@/db/analytics-schema";
import { getCurrentUser } from "@/lib/auth";
import { deviceCategory, encryptIp, ipHash, requestGeo, requestIp, safeLabel, safePath, sessionKeyHash } from "@/lib/visitor-privacy";

export const runtime = "nodejs";

const schema = z.object({
  eventType: z.string().trim().min(1).max(80),
  path: z.string().max(1200).optional(),
  title: z.string().max(300).optional(),
  referrer: z.string().max(2000).optional(),
  elementTag: z.string().max(30).optional(),
  elementRole: z.string().max(50).optional(),
  elementLabel: z.string().max(240).optional(),
  targetPath: z.string().max(1200).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  clientOccurredAt: z.string().datetime().optional(),
  activeDeltaSeconds: z.number().int().min(0).max(60).optional(),
  consent: z.object({ analytics: z.boolean(), marketing: z.boolean() })
});

const SAFE_METADATA_KEYS = new Set([
  "scrollDepth", "viewportWidth", "viewportHeight", "language", "cta", "funnelStep",
  "serviceId", "serviceSlug", "providerSlug", "bookingId", "plan", "source", "medium",
  "campaign", "content", "term", "checkoutState", "result", "reason", "durationMs"
]);

function sanitizeMetadata(input?: Record<string, unknown>) {
  const output: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    if (!SAFE_METADATA_KEYS.has(key)) continue;
    if (typeof value === "string") output[key] = value.slice(0, 300);
    else if (typeof value === "number" && Number.isFinite(value)) output[key] = value;
    else if (typeof value === "boolean" || value === null) output[key] = value;
  }
  return output;
}

function utm(urlValue?: string) {
  try {
    const url = new URL(urlValue || "", "https://verotask.local");
    const get = (key: string) => url.searchParams.get(key)?.slice(0, 180) || null;
    return {
      utmSource: get("utm_source"),
      utmMedium: get("utm_medium"),
      utmCampaign: get("utm_campaign"),
      utmContent: get("utm_content"),
      utmTerm: get("utm_term")
    };
  } catch {
    return { utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null, utmTerm: null };
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_event" }, { status: 400 });

  const globalPrivacyControl = request.headers.get("sec-gpc") === "1" || request.headers.get("dnt") === "1";
  const analyticsConsent = parsed.data.consent.analytics && !globalPrivacyControl;
  const marketingConsent = parsed.data.consent.marketing && !globalPrivacyControl;
  if (!analyticsConsent && parsed.data.eventType !== "consent_updated") {
    return NextResponse.json({ ok: true, recorded: false });
  }

  const db = getDb();
  const user = await getCurrentUser();
  const geo = requestGeo(request.headers);
  const rawIp = requestIp(request.headers);
  const userAgent = request.headers.get("user-agent")?.slice(0, 2000) || "";
  const now = new Date();

  let rawSessionKey = request.cookies.get("vt_analytics")?.value;
  const isNewCookie = !rawSessionKey;
  if (!rawSessionKey) rawSessionKey = randomBytes(32).toString("base64url");
  const keyHash = sessionKeyHash(rawSessionKey);

  let [session] = await db.select().from(visitorSessions).where(eq(visitorSessions.sessionKeyHash, keyHash)).limit(1);
  const path = safePath(parsed.data.path);
  const utms = utm(parsed.data.path);

  if (!session) {
    [session] = await db.insert(visitorSessions).values({
      sessionKeyHash: keyHash,
      userId: user?.id,
      entryPath: path,
      exitPath: path,
      referrer: parsed.data.referrer?.slice(0, 2000),
      ...utms,
      ...geo,
      ipHash: rawIp ? ipHash(rawIp) : null,
      ipEncrypted: rawIp ? encryptIp(rawIp) : null,
      userAgent,
      deviceCategory: deviceCategory(userAgent),
      analyticsConsent,
      marketingConsent,
      doNotTrack: globalPrivacyControl
    }).returning();
  } else {
    await db.update(visitorSessions).set({
      userId: session.userId ?? user?.id,
      lastSeenAt: now,
      exitPath: path ?? session.exitPath,
      analyticsConsent,
      marketingConsent,
      doNotTrack: globalPrivacyControl,
      activeSeconds: sql`${visitorSessions.activeSeconds} + ${parsed.data.activeDeltaSeconds ?? 0}`,
      updatedAt: now
    }).where(eq(visitorSessions.id, session.id));
  }

  if (parsed.data.eventType !== "heartbeat") {
    await db.insert(analyticsEvents).values({
      sessionId: session.id,
      userId: user?.id,
      eventType: parsed.data.eventType,
      path,
      title: safeLabel(parsed.data.title),
      referrer: parsed.data.referrer?.slice(0, 2000),
      elementTag: safeLabel(parsed.data.elementTag)?.slice(0, 30),
      elementRole: safeLabel(parsed.data.elementRole)?.slice(0, 50),
      elementLabel: safeLabel(parsed.data.elementLabel),
      targetPath: safePath(parsed.data.targetPath),
      metadata: sanitizeMetadata(parsed.data.metadata),
      clientOccurredAt: parsed.data.clientOccurredAt ? new Date(parsed.data.clientOccurredAt) : null,
      requestId: request.headers.get("x-vercel-id")?.slice(0, 160)
    });
  }

  if (user) {
    const [contact] = await db.select().from(crmContacts).where(eq(crmContacts.email, user.email.toLowerCase())).limit(1);
    const contactValues = {
      userId: user.id,
      name: user.name,
      phone: user.phone,
      locale: user.locale,
      marketingConsent,
      consentCapturedAt: marketingConsent ? now : contact?.consentCapturedAt,
      consentSource: marketingConsent ? "platform_consent" : contact?.consentSource,
      countryCode: geo.countryCode,
      region: geo.region,
      city: geo.city,
      lastSeenAt: now,
      updatedAt: now
    };
    if (contact) await db.update(crmContacts).set(contactValues).where(eq(crmContacts.id, contact.id));
    else await db.insert(crmContacts).values({ email: user.email.toLowerCase(), lifecycle: user.role === "provider" ? "provider" : "lead", ...contactValues });
  }

  const response = NextResponse.json({ ok: true, recorded: analyticsConsent, sessionId: session.id });
  if (analyticsConsent && isNewCookie) {
    response.cookies.set("vt_analytics", rawSessionKey, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 180
    });
  }
  return response;
}
