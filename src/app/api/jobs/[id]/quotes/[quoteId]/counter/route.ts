import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { quoteOffers, quotes } from "@/db/marketplace-schema";
import { businesses, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { sendTransactionalEmail } from "@/lib/email";
import { requireCustomerJob } from "@/lib/job-access";
import { calculateQuoteFromCustomerServicePrice, quotePricingDisclosure } from "@/lib/quote-pricing";

const schema = z.object({
  servicePriceCents: z.number().int().min(100).max(10_000_000),
  note: z.string().trim().max(1000).optional()
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; quoteId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id, quoteId } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_counter_offer" }, { status: 400 });

  let job;
  try { job = await requireCustomerJob(id, user.id); }
  catch { return NextResponse.json({ error: "forbidden" }, { status: 403 }); }
  if (!["open", "quoting"].includes(job.status)) return NextResponse.json({ error: "job_not_open" }, { status: 409 });

  const db = getDb();
  const [row] = await db.select({ quote: quotes, business: businesses })
    .from(quotes)
    .innerJoin(businesses, eq(businesses.id, quotes.businessId))
    .where(and(eq(quotes.id, quoteId), eq(quotes.jobRequestId, job.id)))
    .limit(1);
  if (!row || !["submitted", "countered"].includes(row.quote.status)) return NextResponse.json({ error: "quote_not_available" }, { status: 404 });

  const pricing = calculateQuoteFromCustomerServicePrice(parsed.data.servicePriceCents, row.business.plan);
  await db.update(quoteOffers).set({ status: "superseded" }).where(and(eq(quoteOffers.quoteId, row.quote.id), eq(quoteOffers.status, "pending")));
  const [offer] = await db.insert(quoteOffers).values({
    quoteId: row.quote.id,
    offeredByUserId: user.id,
    offeredByRole: "customer",
    serviceSubtotalCents: pricing.serviceSubtotalCents,
    providerPayoutCents: pricing.providerPayoutCents,
    providerCommissionCents: pricing.providerCommissionCents,
    customerProtectionFeeCents: pricing.customerProtectionFeeCents,
    customerTotalCents: pricing.customerTotalCents,
    status: "pending",
    note: parsed.data.note
  }).returning();

  await db.update(quotes).set({
    status: "countered",
    serviceSubtotalCents: pricing.serviceSubtotalCents,
    providerPayoutCents: pricing.providerPayoutCents,
    providerCommissionCents: pricing.providerCommissionCents,
    customerProtectionFeeCents: pricing.customerProtectionFeeCents,
    customerTotalCents: pricing.customerTotalCents,
    updatedAt: new Date()
  }).where(eq(quotes.id, row.quote.id));

  if (row.business.ownerUserId) {
    const [owner] = await db.select().from(users).where(eq(users.id, row.business.ownerUserId)).limit(1);
    if (owner) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      try {
        await sendTransactionalEmail({
          to: owner.email,
          subject: `Counter offer on ${job.title}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#13231d"><h1 style="font-size:24px">The customer sent a counter offer</h1><p>Customer service price: <strong>$${(pricing.serviceSubtotalCents / 100).toFixed(2)}</strong></p><p>Your expected payout after your current VeroTask plan fee: <strong>$${(pricing.providerPayoutCents / 100).toFixed(2)}</strong></p><p>Other professionals cannot see this price.</p><p style="margin:28px 0"><a href="${baseUrl}/jobs/${job.id}" style="background:#126a4b;color:white;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">Respond to offer</a></p></div>`
        });
      } catch (error) { console.error("[VeroTask counter notification]", error); }
    }
  }

  return NextResponse.json({ offerId: offer.id, status: offer.status, pricing: quotePricingDisclosure(pricing) });
}
