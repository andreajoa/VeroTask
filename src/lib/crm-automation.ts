import { addDays, addHours, addMinutes } from "date-fns";
import { and, desc, eq, isNotNull, lt, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { analyticsEvents, crmAbandonments, crmCampaigns, crmContacts, visitorSessions } from "@/db/analytics-schema";
import { bookings, businesses, users } from "@/db/schema";
import { sendCrmEmail } from "@/lib/crm-email";

function lifecycleRank(value: typeof crmContacts.$inferSelect.lifecycle) {
  const order = ["visitor", "lead", "abandoned_checkout", "customer", "provider", "subscriber", "churned", "suppressed"] as const;
  return order.indexOf(value);
}

export async function ensureCrmContactForUser(userId: string, desired?: typeof crmContacts.$inferSelect.lifecycle) {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;

  let [contact] = await db.select().from(crmContacts).where(eq(crmContacts.userId, user.id)).limit(1);
  if (!contact) [contact] = await db.select().from(crmContacts).where(eq(crmContacts.email, user.email.toLowerCase())).limit(1);

  const lifecycle = desired && (!contact || lifecycleRank(desired) > lifecycleRank(contact.lifecycle)) ? desired : contact?.lifecycle ?? desired ?? "lead";
  if (contact) {
    [contact] = await db.update(crmContacts).set({
      userId: user.id,
      email: user.email.toLowerCase(),
      name: user.name,
      phone: user.phone,
      locale: user.locale,
      lifecycle,
      updatedAt: new Date()
    }).where(eq(crmContacts.id, contact.id)).returning();
  } else {
    [contact] = await db.insert(crmContacts).values({
      userId: user.id,
      email: user.email.toLowerCase(),
      name: user.name,
      phone: user.phone,
      locale: user.locale,
      lifecycle
    }).returning();
  }
  return contact;
}

export async function syncCustomerStats(userId: string) {
  const db = getDb();
  let contact = await ensureCrmContactForUser(userId, "customer");
  if (!contact) return null;
  const [stats] = await db.select({
    totalBookings: sql<number>`count(*)::int`,
    totalSpendCents: sql<number>`coalesce(sum(case when ${bookings.status} not in ('requested','cancelled') then ${bookings.subtotalCents} else 0 end), 0)::int`,
    lastBookingAt: sql<Date | null>`max(${bookings.createdAt})`
  }).from(bookings).where(eq(bookings.customerId, userId));
  [contact] = await db.update(crmContacts).set({
    lifecycle: "customer",
    totalBookings: stats?.totalBookings ?? 0,
    totalSpendCents: stats?.totalSpendCents ?? 0,
    lastBookingAt: stats?.lastBookingAt ?? null,
    leadScore: sql`greatest(${crmContacts.leadScore}, 30)`,
    updatedAt: new Date()
  }).where(eq(crmContacts.id, contact.id)).returning();
  return contact;
}

export async function sendBookingThankYou(bookingId: string) {
  const db = getDb();
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking) return;
  const contact = await syncCustomerStats(booking.customerId);
  if (!contact) return;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://verotask.com").replace(/\/$/, "");
  await sendCrmEmail({
    contactId: contact.id,
    templateKey: "booking-thank-you",
    idempotencyKey: `booking-paid:${booking.id}`,
    bookingId: booking.id,
    actionUrl: `${appUrl}/bookings/${booking.id}`,
    transactional: true
  });
  await db.update(crmAbandonments).set({ status: "recovered", recoveredAt: new Date(), nextRunAt: null, updatedAt: new Date() })
    .where(and(eq(crmAbandonments.bookingId, booking.id), eq(crmAbandonments.status, "active")));
}

export async function sendProviderPlanThankYou(businessId: string, subscriptionId: string, plan: string) {
  const db = getDb();
  const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
  if (!business?.ownerUserId) return;
  const contact = await ensureCrmContactForUser(business.ownerUserId, "subscriber");
  if (!contact) return;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://verotask.com").replace(/\/$/, "");
  await sendCrmEmail({
    contactId: contact.id,
    templateKey: "provider-plan-thank-you",
    idempotencyKey: `provider-plan:${subscriptionId}:${plan}`,
    actionUrl: `${appUrl}/dashboard/providers/${business.id}/billing`,
    transactional: true
  });
}

async function discoverAbandonedCheckouts(limit: number) {
  const db = getDb();
  const threshold = addMinutes(new Date(), -30);
  const candidates = await db.select().from(bookings)
    .where(and(eq(bookings.status, "requested"), lt(bookings.createdAt, threshold)))
    .orderBy(desc(bookings.createdAt)).limit(limit);
  let created = 0;

  for (const booking of candidates) {
    const [existing] = await db.select().from(crmAbandonments).where(and(eq(crmAbandonments.bookingId, booking.id), eq(crmAbandonments.kind, "checkout"))).limit(1);
    if (existing) continue;
    const contact = await ensureCrmContactForUser(booking.customerId, "abandoned_checkout");
    if (!contact) continue;
    await db.insert(crmAbandonments).values({
      kind: "checkout",
      status: "active",
      contactId: contact.id,
      bookingId: booking.id,
      context: { businessId: booking.businessId, serviceId: booking.serviceId, subtotalCents: booking.subtotalCents },
      nextRunAt: new Date(),
      expiresAt: addDays(booking.createdAt, 8)
    });
    created += 1;
  }
  return created;
}

async function discoverAbandonedCarts(limit: number) {
  const db = getDb();
  const threshold = addMinutes(new Date(), -45);
  const since = addDays(new Date(), -8);
  const candidates = await db.select({ event: analyticsEvents, session: visitorSessions })
    .from(analyticsEvents)
    .innerJoin(visitorSessions, eq(visitorSessions.id, analyticsEvents.sessionId))
    .where(and(
      eq(analyticsEvents.eventType, "page_view"),
      isNotNull(analyticsEvents.userId),
      sql`${analyticsEvents.path} like '/book/%'`,
      lt(analyticsEvents.occurredAt, threshold),
      sql`${analyticsEvents.occurredAt} >= ${since}`
    )).orderBy(desc(analyticsEvents.occurredAt)).limit(limit);

  let created = 0;
  for (const { event, session } of candidates) {
    if (!event.userId) continue;
    const [existing] = await db.select().from(crmAbandonments).where(and(eq(crmAbandonments.sessionId, session.id), eq(crmAbandonments.kind, "cart"))).limit(1);
    if (existing) continue;
    const [laterBooking] = await db.select({ id: bookings.id }).from(bookings).where(and(
      eq(bookings.customerId, event.userId),
      sql`${bookings.createdAt} >= ${event.occurredAt}`,
      sql`${bookings.createdAt} <= ${addHours(event.occurredAt, 2)}`
    )).limit(1);
    if (laterBooking) continue;
    const contact = await ensureCrmContactForUser(event.userId, "lead");
    if (!contact) continue;
    await db.insert(crmAbandonments).values({
      kind: "cart",
      status: "active",
      contactId: contact.id,
      sessionId: session.id,
      context: { path: event.path },
      nextRunAt: new Date(),
      expiresAt: addDays(event.occurredAt, 8)
    });
    created += 1;
  }
  return created;
}

async function recoverConvertedAbandonments(limit: number) {
  const db = getDb();
  const active = await db.select().from(crmAbandonments).where(eq(crmAbandonments.status, "active")).limit(limit);
  let recovered = 0;
  for (const item of active) {
    if (item.bookingId) {
      const [booking] = await db.select({ status: bookings.status }).from(bookings).where(eq(bookings.id, item.bookingId)).limit(1);
      if (booking && booking.status !== "requested") {
        await db.update(crmAbandonments).set({ status: "recovered", recoveredAt: new Date(), nextRunAt: null, updatedAt: new Date() }).where(eq(crmAbandonments.id, item.id));
        recovered += 1;
        continue;
      }
    }
    if (item.kind === "cart") {
      const [contact] = await db.select().from(crmContacts).where(eq(crmContacts.id, item.contactId)).limit(1);
      if (!contact?.userId) continue;
      const [booking] = await db.select({ id: bookings.id }).from(bookings).where(and(eq(bookings.customerId, contact.userId), sql`${bookings.createdAt} > ${item.createdAt}`)).limit(1);
      if (booking) {
        await db.update(crmAbandonments).set({ status: "recovered", recoveredAt: new Date(), nextRunAt: null, updatedAt: new Date() }).where(eq(crmAbandonments.id, item.id));
        recovered += 1;
      }
    }
  }
  return recovered;
}

const FOLLOW_UP_HOURS = [0, 6, 24, 72, 168];

async function sendDueRecovery(limit: number) {
  const db = getDb();
  const due = await db.select().from(crmAbandonments).where(and(eq(crmAbandonments.status, "active"), lte(crmAbandonments.nextRunAt, new Date()))).orderBy(crmAbandonments.nextRunAt).limit(limit);
  let sent = 0;
  let cancelled = 0;
  for (const item of due) {
    const step = item.stepSent + 1;
    if (step > 5) {
      await db.update(crmAbandonments).set({ status: "expired", nextRunAt: null, updatedAt: new Date() }).where(eq(crmAbandonments.id, item.id));
      continue;
    }
    const templateKey = `${item.kind === "checkout" ? "abandoned-checkout" : "abandoned-cart"}-${step}`;
    const result = await sendCrmEmail({
      contactId: item.contactId,
      templateKey,
      idempotencyKey: `recovery:${item.id}:${step}`,
      bookingId: item.bookingId,
      sequenceIndex: step
    });
    if (result.skipped && result.reason === "not_marketable") {
      await db.update(crmAbandonments).set({ status: "cancelled", nextRunAt: null, updatedAt: new Date() }).where(eq(crmAbandonments.id, item.id));
      cancelled += 1;
      continue;
    }
    const finished = step >= 5;
    const next = finished ? null : addHours(item.createdAt, FOLLOW_UP_HOURS[step]);
    await db.update(crmAbandonments).set({
      stepSent: step,
      lastSentAt: new Date(),
      nextRunAt: next,
      status: finished ? "expired" : "active",
      updatedAt: new Date()
    }).where(eq(crmAbandonments.id, item.id));
    sent += 1;
  }
  return { sent, cancelled };
}

function matchesSegment(contact: typeof crmContacts.$inferSelect, segment: string) {
  if (segment === "all_marketable") return true;
  if (segment === "customers") return contact.lifecycle === "customer";
  if (segment === "providers") return contact.lifecycle === "provider" || contact.lifecycle === "subscriber";
  if (segment === "lapsed_customers") return contact.lifecycle === "customer" && Boolean(contact.lastBookingAt && contact.lastBookingAt < addDays(new Date(), -45));
  if (segment.startsWith("city:")) return contact.city?.toLowerCase() === segment.slice(5).toLowerCase();
  if (segment.startsWith("country:")) return contact.countryCode?.toLowerCase() === segment.slice(8).toLowerCase();
  return false;
}

async function runScheduledCampaigns(limitCampaigns = 5) {
  const db = getDb();
  const campaigns = await db.select().from(crmCampaigns).where(and(eq(crmCampaigns.status, "scheduled"), lte(crmCampaigns.scheduledAt, new Date()))).limit(limitCampaigns);
  let campaignsSent = 0;
  let emailsSent = 0;
  for (const campaign of campaigns) {
    await db.update(crmCampaigns).set({ status: "sending", updatedAt: new Date() }).where(eq(crmCampaigns.id, campaign.id));
    const contacts = await db.select().from(crmContacts).where(and(eq(crmContacts.marketingConsent, true), sql`${crmContacts.unsubscribedAt} is null`, sql`${crmContacts.suppressionReason} is null`)).limit(1000);
    for (const contact of contacts.filter((value) => matchesSegment(value, campaign.segment))) {
      const result = await sendCrmEmail({ contactId: contact.id, templateKey: campaign.templateKey, campaignId: campaign.id, idempotencyKey: `campaign:${campaign.id}:${contact.id}` });
      if (!result.skipped) emailsSent += 1;
    }
    await db.update(crmCampaigns).set({ status: "sent", sentAt: new Date(), updatedAt: new Date() }).where(eq(crmCampaigns.id, campaign.id));
    campaignsSent += 1;
  }
  return { campaignsSent, emailsSent };
}

export async function runCrmAutomations(limit = 100) {
  const [checkoutCreated, cartCreated, recovered] = await Promise.all([
    discoverAbandonedCheckouts(limit),
    discoverAbandonedCarts(limit),
    recoverConvertedAbandonments(limit * 2)
  ]);
  const [recovery, campaigns] = await Promise.all([sendDueRecovery(limit), runScheduledCampaigns(5)]);
  return { checkoutCreated, cartCreated, recovered, recovery, campaigns };
}
