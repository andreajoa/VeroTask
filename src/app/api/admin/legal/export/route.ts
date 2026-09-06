import { createHash } from "node:crypto";
import { desc, eq, inArray, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { adminAuditEvents, analyticsEvents, auditExports, crmAbandonments, crmContacts, crmEmailEvents, crmEmailSends, legalCases, legalHolds, visitorSessions } from "@/db/analytics-schema";
import { bookingEvidence, bookingEvents, bookings, businesses, conversations, disputes, messages, providerSubscriptions, providerTransfers, refunds, reviews, services, users } from "@/db/schema";
import { logAdminAudit } from "@/lib/admin-audit";
import { isAdminSession } from "@/lib/admin-auth";
import { decryptIp } from "@/lib/visitor-privacy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function GET(request: NextRequest) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const bookingId = request.nextUrl.searchParams.get("bookingId") || null;
  const requestedUserId = request.nextUrl.searchParams.get("userId") || null;
  const sessionId = request.nextUrl.searchParams.get("sessionId") || null;
  const caseReference = request.nextUrl.searchParams.get("caseReference") || null;
  if (!bookingId && !requestedUserId && !sessionId) return NextResponse.json({ error: "scope_required" }, { status: 400 });

  const db = getDb();
  let userId = requestedUserId;
  let primaryBooking: typeof bookings.$inferSelect | null = null;
  let primarySession: typeof visitorSessions.$inferSelect | null = null;

  if (bookingId) {
    [primaryBooking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!primaryBooking) return NextResponse.json({ error: "booking_not_found" }, { status: 404 });
    userId = primaryBooking.customerId;
  }
  if (sessionId) {
    [primarySession] = await db.select().from(visitorSessions).where(eq(visitorSessions.id, sessionId)).limit(1);
    if (!primarySession) return NextResponse.json({ error: "session_not_found" }, { status: 404 });
    userId = userId || primarySession.userId;
  }

  const userRows = userId ? await db.select().from(users).where(eq(users.id, userId)).limit(1) : [];
  const user = userRows[0] ?? null;
  const bookingRows = bookingId ? [primaryBooking!] : userId ? await db.select().from(bookings).where(eq(bookings.customerId, userId)).orderBy(desc(bookings.createdAt)).limit(500) : [];
  const bookingIds = bookingRows.map((booking) => booking.id);
  const businessIds = [...new Set(bookingRows.map((booking) => booking.businessId))];
  const serviceIds = [...new Set(bookingRows.map((booking) => booking.serviceId).filter((id): id is string => Boolean(id)))];

  const sessionRows = sessionId ? [primarySession!] : userId ? await db.select().from(visitorSessions).where(eq(visitorSessions.userId, userId)).orderBy(desc(visitorSessions.startedAt)).limit(500) : [];
  const sessionIds = sessionRows.map((session) => session.id);

  const [
    businessRows, serviceRows, eventRows, evidenceRows, disputeRows, refundRows, transferRows, reviewRows,
    conversationRows, analyticsRows, contactRows, holdRows, caseRows, subscriptionRows
  ] = await Promise.all([
    businessIds.length ? db.select().from(businesses).where(inArray(businesses.id, businessIds)) : Promise.resolve([]),
    serviceIds.length ? db.select().from(services).where(inArray(services.id, serviceIds)) : Promise.resolve([]),
    bookingIds.length ? db.select().from(bookingEvents).where(inArray(bookingEvents.bookingId, bookingIds)).orderBy(bookingEvents.createdAt).limit(10000) : Promise.resolve([]),
    bookingIds.length ? db.select().from(bookingEvidence).where(inArray(bookingEvidence.bookingId, bookingIds)).orderBy(bookingEvidence.capturedAt).limit(10000) : Promise.resolve([]),
    bookingIds.length ? db.select().from(disputes).where(inArray(disputes.bookingId, bookingIds)).orderBy(disputes.createdAt).limit(2000) : Promise.resolve([]),
    bookingIds.length ? db.select().from(refunds).where(inArray(refunds.bookingId, bookingIds)).orderBy(refunds.createdAt).limit(2000) : Promise.resolve([]),
    bookingIds.length ? db.select().from(providerTransfers).where(inArray(providerTransfers.bookingId, bookingIds)).orderBy(providerTransfers.createdAt).limit(2000) : Promise.resolve([]),
    bookingIds.length ? db.select().from(reviews).where(inArray(reviews.bookingId, bookingIds)).orderBy(reviews.createdAt).limit(2000) : Promise.resolve([]),
    bookingIds.length ? db.select().from(conversations).where(inArray(conversations.bookingId, bookingIds)).limit(1000) : Promise.resolve([]),
    sessionIds.length ? db.select().from(analyticsEvents).where(inArray(analyticsEvents.sessionId, sessionIds)).orderBy(analyticsEvents.occurredAt).limit(20000) : Promise.resolve([]),
    userId ? db.select().from(crmContacts).where(eq(crmContacts.userId, userId)).limit(1) : Promise.resolve([]),
    db.select().from(legalHolds).where(or(
      bookingIds.length ? inArray(legalHolds.bookingId, bookingIds) : eq(legalHolds.id, "00000000-0000-0000-0000-000000000000"),
      userId ? eq(legalHolds.userId, userId) : eq(legalHolds.id, "00000000-0000-0000-0000-000000000000"),
      sessionIds.length ? inArray(legalHolds.sessionId, sessionIds) : eq(legalHolds.id, "00000000-0000-0000-0000-000000000000")
    )),
    caseReference ? db.select().from(legalCases).where(eq(legalCases.caseReference, caseReference)).limit(1) : Promise.resolve([]),
    businessIds.length ? db.select().from(providerSubscriptions).where(inArray(providerSubscriptions.businessId, businessIds)).limit(2000) : Promise.resolve([])
  ]);

  const conversationIds = conversationRows.map((conversation) => conversation.id);
  const messageRows = conversationIds.length ? await db.select().from(messages).where(inArray(messages.conversationId, conversationIds)).orderBy(messages.createdAt).limit(20000) : [];
  const providerOwnerIds = [...new Set(businessRows.map((business) => business.ownerUserId).filter((id): id is string => Boolean(id)))];
  const providerOwners = providerOwnerIds.length ? await db.select().from(users).where(inArray(users.id, providerOwnerIds)) : [];

  const contact = contactRows[0] ?? null;
  const emailSends = contact ? await db.select().from(crmEmailSends).where(eq(crmEmailSends.contactId, contact.id)).orderBy(crmEmailSends.createdAt).limit(5000) : [];
  const emailSendIds = emailSends.map((send) => send.id);
  const emailEvents = emailSendIds.length ? await db.select().from(crmEmailEvents).where(inArray(crmEmailEvents.sendId, emailSendIds)).orderBy(crmEmailEvents.occurredAt).limit(10000) : [];
  const abandonments = contact ? await db.select().from(crmAbandonments).where(eq(crmAbandonments.contactId, contact.id)).orderBy(crmAbandonments.createdAt).limit(1000) : [];

  const scopeIds = [...bookingIds, ...sessionIds, ...(userId ? [userId] : [])];
  const adminEvents = scopeIds.length ? await db.select().from(adminAuditEvents).where(or(...scopeIds.map((id) => eq(adminAuditEvents.resourceId, id)))).orderBy(adminAuditEvents.occurredAt).limit(5000) : [];

  const exportedSessions = sessionRows.map((session) => ({
    ...session,
    decryptedIp: decryptIp(session.ipEncrypted),
    ipInterpretation: "Network IP evidence; Vercel/IP geolocation is approximate and is not precise physical GPS evidence."
  }));

  const data = jsonSafe({
    exportVersion: "verotask-legal-export-v1",
    generatedAt: new Date().toISOString(),
    scope: { bookingId, userId, sessionId, caseReference },
    legalCase: caseRows[0] ?? null,
    legalHolds: holdRows,
    customer: user,
    providers: { businesses: businessRows, owners: providerOwners, subscriptions: subscriptionRows },
    services: serviceRows,
    bookings: bookingRows,
    bookingEvents: eventRows,
    evidence: evidenceRows.map((item) => ({ ...item, fileReferenceNote: item.objectUrl ? "Private storage object reference. Retrieve through audited VeroTask evidence access." : null })),
    disputes: disputeRows,
    refunds: refundRows,
    providerTransfers: transferRows,
    reviews: reviewRows,
    conversations: conversationRows,
    messages: messageRows,
    digitalSessions: exportedSessions,
    analyticsEvents: analyticsRows,
    crm: { contact, abandonments, emailSends, emailEvents },
    adminAccessEvents: adminEvents,
    externalSystemNotice: {
      stripe: "VeroTask stores Stripe object identifiers and marketplace state, not full card number or CVV. Additional payment-processor records must be obtained from Stripe through appropriate authorized access or legal process.",
      geolocation: "IP city/region/country is approximate. Booking GPS check-in/out evidence, when present, is stored separately with distance from the service point.",
      analytics: "Detailed clickstream is stored only when analytics consent permits it; security, booking and payment audit records are independent of marketing analytics consent."
    }
  });

  const payloadWithoutHash = JSON.stringify(data);
  const manifestHash = createHash("sha256").update(payloadWithoutHash).digest("hex");
  const caseId = caseRows[0]?.id ?? null;
  await db.insert(auditExports).values({
    caseId,
    requestedBy: "password-admin",
    scope: { bookingId, userId, sessionId, caseReference },
    manifestHash,
    metadata: { bookingCount: bookingRows.length, sessionCount: sessionRows.length, evidenceCount: evidenceRows.length, eventCount: eventRows.length + analyticsRows.length }
  });
  await logAdminAudit({
    action: "legal.export",
    resourceType: bookingId ? "booking" : userId ? "user" : "session",
    resourceId: bookingId || userId || sessionId,
    metadata: { caseReference, manifestHash, bookingCount: bookingRows.length, sessionCount: sessionRows.length },
    headers: request.headers
  });

  const finalPayload = JSON.stringify({ ...data, manifest: { algorithm: "SHA-256", hash: manifestHash, hashedContent: "export payload excluding manifest" } }, null, 2);
  const filename = `verotask-legal-export-${bookingId || userId || sessionId}-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(finalPayload, { headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="${filename}"`, "cache-control": "no-store" } });
}
