import { randomBytes } from "node:crypto";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { bookings, businesses, services } from "@/db/schema";
import { customerProviderRelationships, marketplaceSearches, providerInteractionEvents } from "@/db/personalization-schema";

export const PERSONALIZATION_COOKIE = "verotask_personalization";

export type ReturningContext = {
  recentSearch?: {
    query: string;
    location: string | null;
    projectSize: string | null;
    timeline: string | null;
    specificDate: string | null;
    details: string | null;
  };
  rebook?: {
    businessId: string;
    businessName: string;
    businessSlug: string;
    lastServiceName: string | null;
    lastServiceQuery: string | null;
    lastLocation: string | null;
    lastCompletedAt: string | null;
    completedCount: number;
    affinityScore: number;
  };
};

export async function getOrCreateAnonymousPersonalizationId() {
  const store = await cookies();
  const existing = store.get(PERSONALIZATION_COOKIE)?.value;
  if (existing) return existing;
  const value = randomBytes(18).toString("hex");
  store.set(PERSONALIZATION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  });
  return value;
}

export async function getAnonymousPersonalizationId() {
  const store = await cookies();
  return store.get(PERSONALIZATION_COOKIE)?.value ?? null;
}

export async function claimAnonymousPersonalizationForUser(userId: string) {
  const anonymousId = await getAnonymousPersonalizationId();
  if (!anonymousId) return;
  const db = getDb();
  await db.update(marketplaceSearches)
    .set({ userId })
    .where(and(eq(marketplaceSearches.anonymousId, anonymousId), isNull(marketplaceSearches.userId)));
  await db.update(providerInteractionEvents)
    .set({ userId })
    .where(and(eq(providerInteractionEvents.anonymousId, anonymousId), isNull(providerInteractionEvents.userId)));
}

export async function recordMarketplaceSearch(input: {
  userId?: string | null;
  anonymousId?: string | null;
  query: string;
  location?: string | null;
  projectSize?: string | null;
  timeline?: string | null;
  specificDate?: string | null;
  details?: string | null;
  source?: string;
}) {
  const db = getDb();
  await db.insert(marketplaceSearches).values({
    userId: input.userId ?? null,
    anonymousId: input.anonymousId ?? null,
    query: input.query.trim().slice(0, 280),
    location: input.location?.trim().slice(0, 180) || null,
    projectSize: input.projectSize?.slice(0, 40) || null,
    timeline: input.timeline?.slice(0, 40) || null,
    specificDate: input.specificDate?.slice(0, 32) || null,
    details: input.details?.trim().slice(0, 4000) || null,
    source: input.source?.slice(0, 40) || "guided_match"
  });
}

export async function recordProviderInteraction(input: {
  userId?: string | null;
  anonymousId?: string | null;
  businessId: string;
  bookingId?: string | null;
  eventType: string;
  metadata?: Record<string, unknown>;
}) {
  const db = getDb();
  await db.insert(providerInteractionEvents).values({
    userId: input.userId ?? null,
    anonymousId: input.anonymousId ?? null,
    businessId: input.businessId,
    bookingId: input.bookingId ?? null,
    eventType: input.eventType.slice(0, 48),
    metadata: input.metadata ?? {}
  });
}

export async function getReturningContext(userId?: string | null): Promise<ReturningContext> {
  const db = getDb();
  const anonymousId = await getAnonymousPersonalizationId();
  const searchIdentity = userId
    ? or(eq(marketplaceSearches.userId, userId), anonymousId ? eq(marketplaceSearches.anonymousId, anonymousId) : undefined!)
    : anonymousId ? eq(marketplaceSearches.anonymousId, anonymousId) : undefined;

  let recentSearch: ReturningContext["recentSearch"] | undefined;
  if (searchIdentity) {
    const [search] = await db.select({
      query: marketplaceSearches.query,
      location: marketplaceSearches.location,
      projectSize: marketplaceSearches.projectSize,
      timeline: marketplaceSearches.timeline,
      specificDate: marketplaceSearches.specificDate,
      details: marketplaceSearches.details
    }).from(marketplaceSearches).where(searchIdentity).orderBy(desc(marketplaceSearches.createdAt)).limit(1);
    recentSearch = search;
  }

  let rebook: ReturningContext["rebook"] | undefined;
  if (userId) {
    const [relationship] = await db.select({
      businessId: customerProviderRelationships.businessId,
      businessName: businesses.name,
      businessSlug: businesses.slug,
      lastServiceName: customerProviderRelationships.lastServiceName,
      lastServiceQuery: customerProviderRelationships.lastServiceQuery,
      lastLocation: customerProviderRelationships.lastLocation,
      lastCompletedAt: customerProviderRelationships.lastCompletedAt,
      completedCount: customerProviderRelationships.completedCount,
      affinityScore: customerProviderRelationships.affinityScore
    })
      .from(customerProviderRelationships)
      .innerJoin(businesses, eq(businesses.id, customerProviderRelationships.businessId))
      .where(and(
        eq(customerProviderRelationships.customerId, userId),
        eq(businesses.active, true)
      ))
      .orderBy(desc(customerProviderRelationships.affinityScore), desc(customerProviderRelationships.lastCompletedAt))
      .limit(1);

    if (relationship) {
      rebook = {
        ...relationship,
        lastCompletedAt: relationship.lastCompletedAt?.toISOString() ?? null,
        affinityScore: Number(relationship.affinityScore)
      };
    }
  }

  return { recentSearch, rebook };
}

export async function syncCustomerProviderRelationship(bookingId: string) {
  const db = getDb();
  const [row] = await db.select({
    booking: bookings,
    business: businesses,
    serviceName: services.name
  })
    .from(bookings)
    .innerJoin(businesses, eq(businesses.id, bookings.businessId))
    .leftJoin(services, eq(services.id, bookings.serviceId))
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!row) return;
  const now = new Date();
  const [existing] = await db.select().from(customerProviderRelationships)
    .where(and(
      eq(customerProviderRelationships.customerId, row.booking.customerId),
      eq(customerProviderRelationships.businessId, row.booking.businessId)
    ))
    .limit(1);

  const completedCount = (existing?.completedCount ?? 0) + 1;
  const bookingCount = Math.max(existing?.bookingCount ?? 0, completedCount);
  const rebookCount = Math.max(0, completedCount - 1);
  const totalSpendCents = (existing?.totalSpendCents ?? 0) + row.booking.subtotalCents;
  const recencyBoost = 20;
  const repeatBoost = Math.min(40, rebookCount * 10);
  const completionBoost = Math.min(30, completedCount * 4);
  const ratingBoost = Math.max(0, (existing?.lastRating ?? 0) * 2);
  const affinityScore = Math.min(100, recencyBoost + repeatBoost + completionBoost + ratingBoost);

  if (existing) {
    await db.update(customerProviderRelationships).set({
      lastBookingAt: row.booking.createdAt,
      lastCompletedAt: now,
      bookingCount,
      completedCount,
      rebookCount,
      totalSpendCents,
      lastBookingId: row.booking.id,
      lastServiceName: row.serviceName ?? existing.lastServiceName,
      lastServiceQuery: row.serviceName ?? existing.lastServiceQuery,
      lastLocation: row.booking.serviceAddress,
      affinityScore: String(affinityScore),
      updatedAt: now
    }).where(eq(customerProviderRelationships.id, existing.id));
  } else {
    await db.insert(customerProviderRelationships).values({
      customerId: row.booking.customerId,
      businessId: row.booking.businessId,
      firstBookingAt: row.booking.createdAt,
      lastBookingAt: row.booking.createdAt,
      lastCompletedAt: now,
      bookingCount: 1,
      completedCount: 1,
      rebookCount: 0,
      totalSpendCents: row.booking.subtotalCents,
      lastBookingId: row.booking.id,
      lastServiceName: row.serviceName,
      lastServiceQuery: row.serviceName,
      lastLocation: row.booking.serviceAddress,
      affinityScore: String(Math.min(100, recencyBoost + completionBoost))
    });
  }

  await recordProviderInteraction({
    userId: row.booking.customerId,
    businessId: row.booking.businessId,
    bookingId: row.booking.id,
    eventType: completedCount > 1 ? "repeat_job_completed" : "job_completed",
    metadata: { completedCount, totalSpendCents, affinityScore }
  });
}
