import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { jobMatches, jobRequests } from "@/db/marketplace-schema";
import { businessCategories, businesses } from "@/db/schema";
import { checkProviderAvailability } from "@/lib/availability";

function radians(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadiusMiles = 3958.8;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function boundedPercent(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0;
}

export function providerMatchScore(input: {
  plan: "free" | "pro" | "elite";
  averageRating: string | number;
  reviewCount: number;
  completedJobs: number;
  cancellationRate: string | number;
  disputeRate: string | number;
  noShowRate: string | number;
  evidenceReliability: string | number;
  distanceMiles?: number | null;
  preferred?: boolean;
}) {
  const rating = Math.max(0, Math.min(5, Number(input.averageRating) || 0));
  const reviewConfidence = Math.min(1, Math.log10(Math.max(1, input.reviewCount + 1)) / 2);
  const provenRating = (rating / 5) * (0.55 + 0.45 * reviewConfidence);
  const jobsScore = Math.min(1, Math.log10(Math.max(1, input.completedJobs + 1)) / 3);
  const reliability = 1 - (
    boundedPercent(input.cancellationRate) * 0.35 +
    boundedPercent(input.disputeRate) * 0.35 +
    boundedPercent(input.noShowRate) * 0.3
  ) / 100;
  const evidence = Math.min(1, boundedPercent(input.evidenceReliability) / 100);
  const distance = input.distanceMiles == null ? 0.5 : Math.max(0, 1 - input.distanceMiles / 30);
  const planBoost = input.plan === "elite" ? 0.08 : input.plan === "pro" ? 0.04 : 0;
  const preferredBoost = input.preferred ? 0.12 : 0;

  return Math.max(0, Math.round(1000 * (
    provenRating * 0.28 +
    jobsScore * 0.17 +
    reliability * 0.27 +
    evidence * 0.13 +
    distance * 0.15 +
    planBoost +
    preferredBoost
  )));
}

export async function matchProvidersForJob(jobRequestId: string, inviteLimit = 25) {
  const db = getDb();
  const [job] = await db.select().from(jobRequests).where(eq(jobRequests.id, jobRequestId)).limit(1);
  if (!job || !["open", "quoting"].includes(job.status)) throw new Error("job_not_open");

  const candidates = await db.select({ business: businesses })
    .from(businessCategories)
    .innerJoin(businesses, eq(businesses.id, businessCategories.businessId))
    .where(and(
      eq(businessCategories.categoryId, job.categoryId),
      eq(businesses.active, true),
      eq(businesses.status, "active"),
      eq(businesses.stripePayoutsEnabled, true)
    ));

  const evaluated: Array<{ businessId: string; score: number; distanceMiles: number | null }> = [];
  for (const { business } of candidates) {
    if (!business.ownerUserId || !business.stripeConnectAccountId || business.ownerUserId === job.customerId) continue;

    let distance: number | null = null;
    if (job.serviceLatitude != null && job.serviceLongitude != null && business.latitude != null && business.longitude != null) {
      distance = distanceMiles(job.serviceLatitude, job.serviceLongitude, business.latitude, business.longitude);
      if (distance > business.serviceRadiusMiles) continue;
    } else if (job.serviceCity && business.city.toLowerCase() !== job.serviceCity.toLowerCase()) {
      continue;
    }

    const end = job.scheduledEnd ?? new Date(job.scheduledStart.getTime() + 60 * 60 * 1000);
    const availability = await checkProviderAvailability(business.id, job.scheduledStart, end);
    if (!availability.available) continue;

    evaluated.push({
      businessId: business.id,
      distanceMiles: distance == null ? null : Math.round(distance),
      score: providerMatchScore({
        plan: business.plan,
        averageRating: business.reviewCount === 0 ? 5 : business.averageRating,
        reviewCount: business.reviewCount,
        completedJobs: business.completedJobs,
        cancellationRate: business.cancellationRate,
        disputeRate: business.disputeRate,
        noShowRate: business.noShowRate,
        evidenceReliability: business.evidenceReliability,
        distanceMiles: distance,
        preferred: business.id === job.preferredBusinessId
      })
    });
  }

  evaluated.sort((a, b) => b.score - a.score);
  const selected = evaluated.slice(0, Math.max(1, Math.min(inviteLimit, 50)));
  for (const candidate of selected) {
    await db.insert(jobMatches).values({
      jobRequestId: job.id,
      businessId: candidate.businessId,
      matchScore: candidate.score,
      distanceMiles: candidate.distanceMiles,
      notifiedAt: new Date()
    }).onConflictDoUpdate({
      target: [jobMatches.jobRequestId, jobMatches.businessId],
      set: { matchScore: candidate.score, distanceMiles: candidate.distanceMiles, notifiedAt: new Date() }
    });
  }

  if (selected.length > 0 && job.status === "open") {
    await db.update(jobRequests).set({ status: "quoting", updatedAt: new Date() }).where(eq(jobRequests.id, job.id));
  }

  return selected;
}
