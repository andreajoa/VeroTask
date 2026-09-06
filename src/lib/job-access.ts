import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { jobMatches, jobRequests } from "@/db/marketplace-schema";
import { businesses } from "@/db/schema";

export async function requireCustomerJob(jobId: string, userId: string) {
  const db = getDb();
  const [job] = await db.select().from(jobRequests).where(and(eq(jobRequests.id, jobId), eq(jobRequests.customerId, userId))).limit(1);
  if (!job) throw new Error("forbidden");
  return job;
}

export async function requireProviderJob(jobId: string, userId: string, businessId?: string) {
  const db = getDb();
  const rows = await db.select({ job: jobRequests, match: jobMatches, business: businesses })
    .from(jobMatches)
    .innerJoin(jobRequests, eq(jobRequests.id, jobMatches.jobRequestId))
    .innerJoin(businesses, eq(businesses.id, jobMatches.businessId))
    .where(and(eq(jobMatches.jobRequestId, jobId), eq(businesses.ownerUserId, userId)));

  const row = businessId ? rows.find((candidate) => candidate.business.id === businessId) : rows[0];
  if (!row) throw new Error("forbidden");
  return row;
}

export function publicJobView(job: typeof jobRequests.$inferSelect) {
  return {
    id: job.id,
    categoryId: job.categoryId,
    title: job.title,
    description: job.description,
    serviceCity: job.serviceCity,
    serviceState: job.serviceState,
    servicePostalCode: job.servicePostalCode,
    scheduledStart: job.scheduledStart,
    scheduledEnd: job.scheduledEnd,
    budgetCents: job.budgetCents,
    currency: job.currency,
    maxQuotes: job.maxQuotes,
    quoteCount: job.quoteCount,
    status: job.status,
    expiresAt: job.expiresAt
  };
}
