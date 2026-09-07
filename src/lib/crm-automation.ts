import { addDays, addHours, addMinutes } from "date-fns";
import { and, asc, desc, eq, gt, isNotNull, lt, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { analyticsEvents, crmAbandonments, crmCampaigns, crmContacts, crmEmailSends, visitorSessions } from "@/db/analytics-schema";
import { bookingCheckoutSessions, providerCheckoutSessions } from "@/db/operations-schema";
import { bookings, businesses, providerSubscriptions, users } from "@/db/schema";
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
    }).onConflictDoUpdate({ target: crmContacts.email, set: { userId: user.id, updatedAt: new Date() } }).returning();
  }
  return contact;
}

export async function syncCustomerStats(userId: string) {
  const db = getDb();
  let contact = await ensureCrmContactForUser(userId, "customer");
  if (!contact) return null;
  const [stats] = await db.select({
    totalBookings: sql<number>`count(*)::int`,
    totalSpendCents: sql<number>`coalesce(sum(case when ${bookings.stripePaymentIntentId} is not null and ${bookings.status} <> 'refunded' then ${bookings.subtotalCents} else 0 end), 0)::int`,
    lastBookingAt: sql<Date | null>`max(${bookings.createdAt})`
  }).from(bookings).where(eq(bookings.customerId, userId));
  [contact] = await db.update(crmContacts).set({
    lifecycle: contact.lifecycle === "suppressed" ? "suppressed" : "customer",
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
  if (!booking?.stripePaymentIntentId || !["scheduled", "in_progress", "provider_completed", "customer_confirmed", "auto_completed", "paid_out"].includes(booking.status)) return;
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
  const candidates = await db.select({ booking: bookings, checkout: bookingCheckoutSessions })
    .from(bookingCheckoutSessions)
    .innerJoin(bookings, eq(bookings.id, bookingCheckoutSessions.bookingId))
    .where(and(
      sql`${bookings.status} in ('payment_authorized', 'accepted')`,
      sql`${bookingCheckoutSessions.status} in ('open', 'expired')`,
      sql`${bookings.scheduledStart} > now()`,
      lt(bookingCheckoutSessions.createdAt, threshold)
    ))
    .orderBy(desc(bookingCheckoutSessions.createdAt)).limit(limit);
  let created = 0;

  for (const { booking, checkout } of candidates) {
    const [existing] = await db.select().from(crmAbandonments).where(and(eq(crmAbandonments.bookingId, booking.id), eq(crmAbandonments.kind, "checkout"))).limit(1);
    if (existing) continue;
    const contact = await ensureCrmContactForUser(booking.customerId, "abandoned_checkout");
    if (!contact) continue;
    await db.insert(crmAbandonments).values({
      kind: "checkout",
      status: "active",
      contactId: contact.id,
      bookingId: booking.id,
      context: {
        businessId: booking.businessId,
        serviceId: booking.serviceId,
        subtotalCents: booking.subtotalCents,
        stripeCheckoutSessionId: checkout.stripeSessionId
      },
      nextRunAt: new Date(),
      expiresAt: addDays(checkout.createdAt, 8)
    }).onConflictDoNothing();
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
    }).onConflictDoNothing();
    created += 1;
  }
  return created;
}

async function discoverAbandonedPlans(limit: number) {
  const db = getDb();
  const rows = await db.select({ checkout: providerCheckoutSessions, business: businesses }).from(providerCheckoutSessions)
    .innerJoin(businesses, eq(businesses.id, providerCheckoutSessions.businessId))
    .where(and(sql`${providerCheckoutSessions.status} in ('open', 'expired')`, lt(providerCheckoutSessions.createdAt, addMinutes(new Date(), -30)))).limit(limit);
  let created = 0;
  for (const { checkout, business } of rows) {
    if (!business.ownerUserId) continue;
    const contact = await ensureCrmContactForUser(business.ownerUserId, "provider");
    if (!contact) continue;
    const result = await db.insert(crmAbandonments).values({
      kind: "checkout", contactId: contact.id, providerCheckoutSessionId: checkout.stripeSessionId,
      context: { businessId: business.id, plan: checkout.plan }, nextRunAt: new Date(), expiresAt: addDays(checkout.createdAt, 8)
    }).onConflictDoNothing().returning();
    created += result.length;
  }
  return created;
}

async function planRecoveryState(item: typeof crmAbandonments.$inferSelect) {
  const db = getDb();
  const businessId = String(item.context.businessId || "");
  if (!/^[0-9a-f-]{36}$/i.test(businessId)) return "cancelled" as const;
  const [subscription] = await db.select().from(providerSubscriptions).where(and(eq(providerSubscriptions.businessId, businessId), eq(providerSubscriptions.active, true))).limit(1);
  if (subscription) return "recovered" as const;
  const [checkout] = await db.select().from(providerCheckoutSessions).where(eq(providerCheckoutSessions.businessId, businessId)).limit(1);
  if (!checkout || checkout.stripeSessionId !== item.providerCheckoutSessionId || !["open", "expired"].includes(checkout.status)) return "cancelled" as const;
  return "active" as const;
}

async function recoverConvertedAbandonments(limit: number) {
  const db = getDb();
  const active = await db.select().from(crmAbandonments).where(eq(crmAbandonments.status, "active")).limit(limit);
  let recovered = 0;
  for (const item of active) {
    if (item.bookingId && item.kind === "checkout") {
      const [booking] = await db.select({ status: bookings.status, paymentIntentId: bookings.stripePaymentIntentId, scheduledStart: bookings.scheduledStart })
        .from(bookings).where(eq(bookings.id, item.bookingId)).limit(1);
      if (booking?.paymentIntentId) {
        await db.update(crmAbandonments).set({ status: "recovered", recoveredAt: new Date(), nextRunAt: null, updatedAt: new Date() }).where(eq(crmAbandonments.id, item.id));
        recovered += 1;
        continue;
      }
      if (booking && (["cancelled", "refunded"].includes(booking.status) || booking.scheduledStart <= new Date())) {
        await db.update(crmAbandonments).set({ status: "cancelled", nextRunAt: null, updatedAt: new Date() }).where(eq(crmAbandonments.id, item.id));
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
    if (item.expiresAt && item.expiresAt <= new Date()) {
      await db.update(crmAbandonments).set({ status: "expired", nextRunAt: null, updatedAt: new Date() }).where(eq(crmAbandonments.id, item.id));
      continue;
    }
    // Re-check conversion immediately before every message, including concurrent cron runs.
    if (item.providerCheckoutSessionId) {
      const state = await planRecoveryState(item);
      if (state !== "active") {
        await db.update(crmAbandonments).set({ status: state, recoveredAt: state === "recovered" ? new Date() : null, nextRunAt: null, updatedAt: new Date() }).where(eq(crmAbandonments.id, item.id));
        continue;
      }
    }
    if (item.bookingId) {
      const [booking] = await db.select().from(bookings).where(eq(bookings.id, item.bookingId)).limit(1);
      if (!booking || booking.stripePaymentIntentId || !["accepted", "payment_authorized"].includes(booking.status) || booking.scheduledStart <= new Date()) {
        await db.update(crmAbandonments).set({ status: booking?.stripePaymentIntentId ? "recovered" : "cancelled", nextRunAt: null, updatedAt: new Date() }).where(eq(crmAbandonments.id, item.id));
        continue;
      }
    }
    const step = item.stepSent + 1;
    if (step > 5) {
      await db.update(crmAbandonments).set({ status: "expired", nextRunAt: null, updatedAt: new Date() }).where(eq(crmAbandonments.id, item.id));
      continue;
    }
    const templateKey = `${item.providerCheckoutSessionId ? "abandoned-plan" : item.kind === "checkout" ? "abandoned-checkout" : "abandoned-cart"}-${step}`;
    let result;
    try { result = await sendCrmEmail({
      contactId: item.contactId,
      templateKey,
      idempotencyKey: `recovery:${item.id}:${step}`,
      bookingId: item.bookingId,
      sequenceIndex: step,
      actionUrl: item.providerCheckoutSessionId ? `${process.env.NEXT_PUBLIC_APP_URL || "https://verotask.com"}/dashboard/providers/${item.context.businessId}/billing?plan=${item.context.plan}` : item.bookingId ? `${process.env.NEXT_PUBLIC_APP_URL || "https://verotask.com"}/bookings/${item.bookingId}` : undefined
    }); } catch { continue; }
    if (result.skipped && result.reason === "not_marketable") {
      await db.update(crmAbandonments).set({ status: "cancelled", nextRunAt: null, updatedAt: new Date() }).where(eq(crmAbandonments.id, item.id));
      cancelled += 1;
      continue;
    }
    if (result.skipped && result.reason !== "already_processed") continue;
    const finished = step >= 5;
    const next = finished ? null : new Date(Math.max(addHours(item.createdAt, FOLLOW_UP_HOURS[step]).getTime(), Date.now() + 6 * 3_600_000));
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
    const [claimed] = await db.update(crmCampaigns).set({ status: "sending", updatedAt: new Date() }).where(and(eq(crmCampaigns.id, campaign.id), eq(crmCampaigns.status, "scheduled"))).returning();
    if (!claimed) continue;
    let failed = false;
    let cursor: string | undefined;
    while (true) {
      const contacts = await db.select().from(crmContacts).where(and(eq(crmContacts.marketingConsent, true), sql`${crmContacts.unsubscribedAt} is null`, sql`${crmContacts.suppressionReason} is null`, lte(crmContacts.createdAt, campaign.scheduledAt || new Date()), cursor ? gt(crmContacts.id, cursor) : undefined)).orderBy(asc(crmContacts.id)).limit(100);
      if (!contacts.length) break;
      for (const contact of contacts.filter((value) => matchesSegment(value, campaign.segment))) {
        try {
          const result = await sendCrmEmail({ contactId: contact.id, templateKey: campaign.templateKey, campaignId: campaign.id, idempotencyKey: `campaign:${campaign.id}:${contact.id}` });
          if (!result.skipped) emailsSent += 1;
          else if (result.reason === "in_progress") failed = true;
        } catch { failed = true; }
      }
      cursor = contacts[contacts.length - 1].id;
    }
    await db.update(crmCampaigns).set({ status: failed ? "failed" : "sent", sentAt: failed ? null : new Date(), updatedAt: new Date() }).where(eq(crmCampaigns.id, campaign.id));
    campaignsSent += 1;
  }
  return { campaignsSent, emailsSent };
}

export async function runCrmAutomations(limit = 100) {
  const [checkoutCreated, cartCreated, planCreated] = await Promise.all([discoverAbandonedCheckouts(limit), discoverAbandonedCarts(limit), discoverAbandonedPlans(limit)]);
  const recovered = await recoverConvertedAbandonments(limit * 2);
  // Signup sends that failed remain retryable independently of a new sign-in.
  const welcomes = await getDb().select().from(crmEmailSends).where(and(eq(crmEmailSends.templateKey, "account-welcome"), eq(crmEmailSends.status, "failed"))).limit(25);
  for (const welcome of welcomes) {
    try { await sendCrmEmail({ contactId: welcome.contactId, templateKey: welcome.templateKey, idempotencyKey: welcome.idempotencyKey, transactional: true }); } catch { /* Retry next run. */ }
  }
  const [recovery, campaigns] = await Promise.all([sendDueRecovery(limit), runScheduledCampaigns(5)]);
  return { checkoutCreated, cartCreated, planCreated, recovered, recovery, campaigns };
}
