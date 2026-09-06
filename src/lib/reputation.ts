import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { bilateralRatings, customerReputation } from "@/db/reputation-schema";
import { bookings, businesses } from "@/db/schema";
import { algorithmReputationScore, averageStars, reputationConfidence, reputationLabel, type ReputationLabel } from "@/lib/reputation-score";

const COMPLETED_BOOKING_STATUSES = ["customer_confirmed", "auto_completed", "paid_out"] as const;

export type ReputationSummary = {
  rating: number;
  ratingCount: number;
  completedJobs: number;
  label: ReputationLabel;
  confidence: number;
  algorithmScore: number;
};

function summary(rating: number, ratingCount: number, completedJobs: number): ReputationSummary {
  return {
    rating,
    ratingCount,
    completedJobs,
    label: reputationLabel(ratingCount, completedJobs),
    confidence: reputationConfidence(ratingCount, completedJobs),
    algorithmScore: algorithmReputationScore({ rating, ratingCount, completedJobs })
  };
}

export async function getCustomerReputationSummary(customerId: string): Promise<ReputationSummary> {
  const db = getDb();
  const [stored, completed] = await Promise.all([
    db.select().from(customerReputation).where(eq(customerReputation.customerId, customerId)).limit(1).then((rows) => rows[0] ?? null),
    db.select({ id: bookings.id }).from(bookings).where(and(
      eq(bookings.customerId, customerId),
      inArray(bookings.status, [...COMPLETED_BOOKING_STATUSES])
    ))
  ]);

  const ratingCount = stored?.ratingCount ?? 0;
  const completedJobs = Math.max(stored?.completedJobs ?? 0, completed.length);
  const rating = ratingCount === 0 ? 5 : Number(stored?.averageRating ?? 5);
  return summary(rating, ratingCount, completedJobs);
}

export async function getProviderReputationSummary(businessId: string): Promise<ReputationSummary> {
  const db = getDb();
  const [business] = await db.select({
    averageRating: businesses.averageRating,
    reviewCount: businesses.reviewCount,
    completedJobs: businesses.completedJobs
  }).from(businesses).where(eq(businesses.id, businessId)).limit(1);

  if (!business) return summary(5, 0, 0);
  const rating = business.reviewCount === 0 ? 5 : Number(business.averageRating);
  return summary(rating, business.reviewCount, business.completedJobs);
}

export async function refreshCustomerReputation(customerId: string) {
  const db = getDb();
  const [ratings, completed] = await Promise.all([
    db.select({ rating: bilateralRatings.rating }).from(bilateralRatings).where(and(
      eq(bilateralRatings.customerId, customerId),
      eq(bilateralRatings.direction, "provider_to_customer")
    )),
    db.select({ id: bookings.id }).from(bookings).where(and(
      eq(bookings.customerId, customerId),
      inArray(bookings.status, [...COMPLETED_BOOKING_STATUSES])
    ))
  ]);

  const average = averageStars(ratings.map((row) => row.rating));

  await db.insert(customerReputation).values({
    customerId,
    averageRating: average.toFixed(2),
    ratingCount: ratings.length,
    completedJobs: completed.length,
    updatedAt: new Date()
  }).onConflictDoUpdate({
    target: customerReputation.customerId,
    set: {
      averageRating: average.toFixed(2),
      ratingCount: ratings.length,
      completedJobs: completed.length,
      updatedAt: new Date()
    }
  });

  return summary(average, ratings.length, completed.length);
}
