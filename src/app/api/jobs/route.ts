import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { jobMatches, jobRequests } from "@/db/marketplace-schema";
import { businesses, categories, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { parseServiceLocalDateTime } from "@/lib/booking";
import { sendTransactionalEmail } from "@/lib/email";
import { geocodeUsAddress } from "@/lib/geocoding";
import { matchProvidersForJob } from "@/lib/job-matching";

const createSchema = z.object({
  categoryId: z.string().uuid(),
  preferredBusinessId: z.string().uuid().optional(),
  title: z.string().trim().min(5).max(180),
  description: z.string().trim().min(10).max(4000),
  serviceAddress: z.string().trim().min(8).max(500),
  serviceCity: z.string().trim().min(2).max(120),
  serviceState: z.string().trim().min(2).max(40).default("FL"),
  servicePostalCode: z.string().trim().max(16).optional(),
  scheduledLocal: z.string().min(10).max(40),
  estimatedDurationMinutes: z.number().int().min(30).max(1440).default(120),
  budgetCents: z.number().int().min(100).max(10_000_000).optional(),
  acceptsPolicy: z.literal(true)
});

async function notifyMatchedProviders(jobId: string) {
  const db = getDb();
  const rows = await db.select({
    business: businesses,
    owner: users,
    job: jobRequests
  }).from(jobMatches)
    .innerJoin(businesses, eq(businesses.id, jobMatches.businessId))
    .innerJoin(users, eq(users.id, businesses.ownerUserId))
    .innerJoin(jobRequests, eq(jobRequests.id, jobMatches.jobRequestId))
    .where(eq(jobMatches.jobRequestId, jobId));

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await Promise.allSettled(rows.map(({ business, owner, job }) => sendTransactionalEmail({
    to: owner.email,
    subject: `New VeroTask opportunity: ${job.title}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#13231d"><h1 style="font-size:24px">A customer needs your service</h1><p><strong>${job.title}</strong></p><p>${job.serviceCity ?? business.city}, ${job.serviceState} · ${job.scheduledStart.toLocaleString("en-US", { timeZone: "America/New_York" })}</p>${job.budgetCents ? `<p>Customer budget: up to $${(job.budgetCents / 100).toFixed(2)} (optional guidance only).</p>` : ""}<p>The customer will compare price, availability, verified history and reliability. Other professionals cannot see your quote.</p><p style="margin:28px 0"><a href="${baseUrl}/dashboard/opportunities" style="background:#126a4b;color:white;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">Review opportunity</a></p></div>`
  })));
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_job_request", details: parsed.error.flatten() }, { status: 400 });

  let scheduledStart: Date;
  try { scheduledStart = parseServiceLocalDateTime(parsed.data.scheduledLocal); }
  catch { return NextResponse.json({ error: "invalid_schedule" }, { status: 400 }); }
  if (scheduledStart.getTime() < Date.now() + 60 * 60 * 1000) {
    return NextResponse.json({ error: "schedule_too_soon" }, { status: 409 });
  }

  const db = getDb();
  const [category] = await db.select().from(categories).where(and(eq(categories.id, parsed.data.categoryId), eq(categories.active, true))).limit(1);
  if (!category) return NextResponse.json({ error: "category_not_found" }, { status: 404 });

  if (parsed.data.preferredBusinessId) {
    const [preferred] = await db.select().from(businesses).where(eq(businesses.id, parsed.data.preferredBusinessId)).limit(1);
    if (!preferred || !preferred.active) return NextResponse.json({ error: "preferred_provider_not_found" }, { status: 404 });
  }

  const geocoded = await geocodeUsAddress(parsed.data.serviceAddress);
  const scheduledEnd = new Date(scheduledStart.getTime() + parsed.data.estimatedDurationMinutes * 60_000);
  const quoteWindowEnd = new Date(Math.min(scheduledStart.getTime() - 2 * 60 * 60 * 1000, Date.now() + 48 * 60 * 60 * 1000));

  const [job] = await db.insert(jobRequests).values({
    customerId: user.id,
    categoryId: category.id,
    preferredBusinessId: parsed.data.preferredBusinessId,
    title: parsed.data.title,
    description: parsed.data.description,
    serviceAddress: parsed.data.serviceAddress,
    serviceLatitude: geocoded?.latitude,
    serviceLongitude: geocoded?.longitude,
    serviceCity: parsed.data.serviceCity,
    serviceState: parsed.data.serviceState.toUpperCase(),
    servicePostalCode: parsed.data.servicePostalCode,
    scheduledStart,
    scheduledEnd,
    budgetCents: parsed.data.budgetCents,
    status: "open",
    maxQuotes: 8,
    expiresAt: quoteWindowEnd
  }).returning();

  const matches = await matchProvidersForJob(job.id);
  void notifyMatchedProviders(job.id).catch((error) => console.error("[VeroTask job notifications]", error));

  return NextResponse.json({
    jobId: job.id,
    status: matches.length ? "quoting" : "open",
    matchedProfessionals: matches.length,
    maxQuotes: job.maxQuotes,
    veroProtect: "Protection applies when communication, booking and payment stay on VeroTask."
  });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getDb();
  const jobs = await db.select().from(jobRequests).where(eq(jobRequests.customerId, user.id)).orderBy(desc(jobRequests.createdAt)).limit(50);
  return NextResponse.json({ jobs });
}
