import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { jobConversations, jobMatches, jobRequests, quoteOffers, quotes } from "@/db/marketplace-schema";
import { businesses, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { sendTransactionalEmail } from "@/lib/email";
import { requireProviderJob } from "@/lib/job-access";
import { calculateQuoteFromProviderDesiredPayout, quotePricingDisclosure } from "@/lib/quote-pricing";

const schema = z.object({
  businessId: z.string().uuid(),
  providerDesiredPayoutCents: z.number().int().min(100).max(10_000_000),
  message: z.string().trim().max(2000).optional(),
  estimatedDurationMinutes: z.number().int().min(30).max(1440).optional()
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_quote", details: parsed.error.flatten() }, { status: 400 });

  let access;
  try { access = await requireProviderJob(id, user.id, parsed.data.businessId); }
  catch { return NextResponse.json({ error: "forbidden" }, { status: 403 }); }
  const { job, business } = access;

  if (!["open", "quoting"].includes(job.status)) return NextResponse.json({ error: "job_not_open" }, { status: 409 });
  if (job.expiresAt && job.expiresAt.getTime() <= Date.now()) return NextResponse.json({ error: "quote_window_expired" }, { status: 409 });

  const db = getDb();
  const [existing] = await db.select().from(quotes).where(and(eq(quotes.jobRequestId, job.id), eq(quotes.businessId, business.id))).limit(1);
  if (!existing && job.quoteCount >= job.maxQuotes) return NextResponse.json({ error: "quote_limit_reached" }, { status: 409 });

  const pricing = calculateQuoteFromProviderDesiredPayout(parsed.data.providerDesiredPayoutCents, business.plan);
  const validUntil = job.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000);

  let quote;
  if (existing) {
    [quote] = await db.update(quotes).set({
      status: "submitted",
      serviceSubtotalCents: pricing.serviceSubtotalCents,
      providerPayoutCents: pricing.providerPayoutCents,
      providerCommissionCents: pricing.providerCommissionCents,
      customerProtectionFeeCents: pricing.customerProtectionFeeCents,
      customerTotalCents: pricing.customerTotalCents,
      message: parsed.data.message,
      estimatedDurationMinutes: parsed.data.estimatedDurationMinutes,
      validUntil,
      updatedAt: new Date()
    }).where(eq(quotes.id, existing.id)).returning();
    await db.update(quoteOffers).set({ status: "superseded" }).where(and(eq(quoteOffers.quoteId, quote.id), eq(quoteOffers.status, "pending")));
  } else {
    [quote] = await db.insert(quotes).values({
      jobRequestId: job.id,
      businessId: business.id,
      status: "submitted",
      serviceSubtotalCents: pricing.serviceSubtotalCents,
      providerPayoutCents: pricing.providerPayoutCents,
      providerCommissionCents: pricing.providerCommissionCents,
      customerProtectionFeeCents: pricing.customerProtectionFeeCents,
      customerTotalCents: pricing.customerTotalCents,
      message: parsed.data.message,
      estimatedDurationMinutes: parsed.data.estimatedDurationMinutes,
      validUntil
    }).returning();
    await db.update(jobRequests).set({ quoteCount: sql`${jobRequests.quoteCount} + 1`, status: "quoting", updatedAt: new Date() }).where(eq(jobRequests.id, job.id));
  }

  await db.insert(quoteOffers).values({
    quoteId: quote.id,
    offeredByUserId: user.id,
    offeredByRole: "provider",
    serviceSubtotalCents: pricing.serviceSubtotalCents,
    providerPayoutCents: pricing.providerPayoutCents,
    providerCommissionCents: pricing.providerCommissionCents,
    customerProtectionFeeCents: pricing.customerProtectionFeeCents,
    customerTotalCents: pricing.customerTotalCents,
    status: "pending",
    note: parsed.data.message
  });
  await db.insert(jobConversations).values({ jobRequestId: job.id, businessId: business.id }).onConflictDoNothing({ target: [jobConversations.jobRequestId, jobConversations.businessId] });
  await db.update(jobMatches).set({ status: "quoted", viewedAt: access.match.viewedAt ?? new Date() }).where(eq(jobMatches.id, access.match.id));

  const [customer] = await db.select().from(users).where(eq(users.id, job.customerId)).limit(1);
  if (customer) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    try {
      await sendTransactionalEmail({
        to: customer.email,
        subject: `New quote for ${job.title}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#13231d"><h1 style="font-size:24px">You received a new VeroTask quote</h1><p><strong>${business.name}</strong> sent a quote for <strong>${job.title}</strong>.</p><p>Service price: <strong>$${(pricing.serviceSubtotalCents / 100).toFixed(2)}</strong><br>Vero Protection &amp; Service Fee: <strong>$${(pricing.customerProtectionFeeCents / 100).toFixed(2)}</strong><br>Total: <strong>$${(pricing.customerTotalCents / 100).toFixed(2)}</strong></p><p>You can compare this with other professionals without exposing their quote prices to one another.</p><p style="margin:28px 0"><a href="${baseUrl}/jobs/${job.id}" style="background:#126a4b;color:white;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">Compare quotes</a></p></div>`
      });
    } catch (error) { console.error("[VeroTask quote notification]", error); }
  }

  return NextResponse.json({ quoteId: quote.id, status: quote.status, pricing: quotePricingDisclosure(pricing) });
}
