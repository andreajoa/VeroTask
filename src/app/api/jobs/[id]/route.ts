import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { jobMatches, quoteOffers, quotes } from "@/db/marketplace-schema";
import { businesses } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { publicJobView, requireCustomerJob, requireProviderJob } from "@/lib/job-access";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const db = getDb();

  try {
    const job = await requireCustomerJob(id, user.id);
    const quoteRows = await db.select({ quote: quotes, business: businesses })
      .from(quotes)
      .innerJoin(businesses, eq(businesses.id, quotes.businessId))
      .where(and(eq(quotes.jobRequestId, job.id)))
      .orderBy(desc(quotes.createdAt));

    const result = [];
    for (const row of quoteRows) {
      const offers = await db.select().from(quoteOffers).where(eq(quoteOffers.quoteId, row.quote.id)).orderBy(desc(quoteOffers.createdAt));
      result.push({
        quote: row.quote,
        latestOffer: offers[0] ?? null,
        professional: {
          id: row.business.id,
          name: row.business.name,
          slug: row.business.slug,
          city: row.business.city,
          state: row.business.state,
          plan: row.business.plan,
          rating: row.business.reviewCount === 0 ? 5 : Number(row.business.averageRating),
          reviewCount: row.business.reviewCount,
          completedJobs: row.business.completedJobs,
          cancellationRate: Number(row.business.cancellationRate),
          disputeRate: Number(row.business.disputeRate),
          noShowRate: Number(row.business.noShowRate),
          evidenceReliability: Number(row.business.evidenceReliability)
        }
      });
    }

    return NextResponse.json({
      role: "customer",
      job,
      quotes: result,
      protection: {
        name: "Vero Protect",
        applies: "Keep communication, booking and payment on VeroTask.",
        includes: ["secure platform payment", "no-show protection", "24-hour service issue window", "dispute review", "eligible full or partial refunds"]
      }
    });
  } catch {
    try {
      const access = await requireProviderJob(id, user.id);
      if (access.match.status === "invited") {
        await db.update(jobMatches).set({ status: "viewed", viewedAt: new Date() }).where(eq(jobMatches.id, access.match.id));
      }
      const [ownQuote] = await db.select().from(quotes).where(and(eq(quotes.jobRequestId, id), eq(quotes.businessId, access.business.id))).limit(1);
      const offers = ownQuote ? await db.select().from(quoteOffers).where(eq(quoteOffers.quoteId, ownQuote.id)).orderBy(desc(quoteOffers.createdAt)) : [];
      return NextResponse.json({
        role: "provider",
        job: publicJobView(access.job),
        business: { id: access.business.id, name: access.business.name, plan: access.business.plan },
        ownQuote: ownQuote ?? null,
        latestOffer: offers[0] ?? null,
        privacy: "The exact service address and customer contact details are released only after the customer accepts a quote and the booking is created.",
        competition: "Other professionals' quote prices are never shown to you."
      });
    } catch {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }
}
