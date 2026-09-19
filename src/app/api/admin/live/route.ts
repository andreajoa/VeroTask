import { desc, eq, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { analyticsEvents, visitorSessions } from "@/db/analytics-schema";
import { users } from "@/db/schema";
import { isAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = getDb();
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

  const [sessions, events] = await Promise.all([
    db.select({
      id: visitorSessions.id,
      userId: visitorSessions.userId,
      email: users.email,
      city: visitorSessions.city,
      region: visitorSessions.region,
      countryCode: visitorSessions.countryCode,
      postalCode: visitorSessions.postalCode,
      deviceCategory: visitorSessions.deviceCategory,
      entryPath: visitorSessions.entryPath,
      exitPath: visitorSessions.exitPath,
      activeSeconds: visitorSessions.activeSeconds,
      lastSeenAt: visitorSessions.lastSeenAt,
      referrer: visitorSessions.referrer,
      utmSource: visitorSessions.utmSource,
      utmCampaign: visitorSessions.utmCampaign
    })
      .from(visitorSessions)
      .leftJoin(users, eq(users.id, visitorSessions.userId))
      .where(gte(visitorSessions.lastSeenAt, fiveMinutesAgo))
      .orderBy(desc(visitorSessions.lastSeenAt))
      .limit(50),
    db.select({
      id: analyticsEvents.id,
      eventType: analyticsEvents.eventType,
      path: analyticsEvents.path,
      elementLabel: analyticsEvents.elementLabel,
      targetPath: analyticsEvents.targetPath,
      occurredAt: analyticsEvents.occurredAt,
      sessionId: analyticsEvents.sessionId,
      city: visitorSessions.city,
      region: visitorSessions.region,
      countryCode: visitorSessions.countryCode
    })
      .from(analyticsEvents)
      .innerJoin(visitorSessions, eq(visitorSessions.id, analyticsEvents.sessionId))
      .where(gte(analyticsEvents.occurredAt, twoMinutesAgo))
      .orderBy(desc(analyticsEvents.occurredAt))
      .limit(80)
  ]);

  return NextResponse.json({
    activeCount: sessions.length,
    generatedAt: new Date().toISOString(),
    sessions,
    events
  }, { headers: { "cache-control": "no-store" } });
}
