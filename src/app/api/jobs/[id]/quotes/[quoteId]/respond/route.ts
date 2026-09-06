import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { quoteOffers, quotes } from "@/db/marketplace-schema";
import { getCurrentUser } from "@/lib/auth";
import { requireProviderJob } from "@/lib/job-access";

const schema = z.object({ action: z.enum(["accept", "decline"]) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; quoteId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id, quoteId } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_response" }, { status: 400 });

  const db = getDb();
  const [quote] = await db.select().from(quotes).where(and(eq(quotes.id, quoteId), eq(quotes.jobRequestId, id))).limit(1);
  if (!quote) return NextResponse.json({ error: "quote_not_found" }, { status: 404 });

  try { await requireProviderJob(id, user.id, quote.businessId); }
  catch { return NextResponse.json({ error: "forbidden" }, { status: 403 }); }

  const [pending] = await db.select().from(quoteOffers)
    .where(and(eq(quoteOffers.quoteId, quote.id), eq(quoteOffers.status, "pending")))
    .orderBy(desc(quoteOffers.createdAt)).limit(1);
  if (!pending || pending.offeredByRole !== "customer") return NextResponse.json({ error: "no_customer_counter_offer" }, { status: 409 });

  if (parsed.data.action === "accept") {
    await db.update(quoteOffers).set({ status: "accepted" }).where(eq(quoteOffers.id, pending.id));
    await db.update(quotes).set({ status: "submitted", updatedAt: new Date() }).where(eq(quotes.id, quote.id));
    return NextResponse.json({ status: "accepted", quoteReadyForCustomer: true });
  }

  await db.update(quoteOffers).set({ status: "declined" }).where(eq(quoteOffers.id, pending.id));
  const [previousProviderOffer] = await db.select().from(quoteOffers)
    .where(and(eq(quoteOffers.quoteId, quote.id), eq(quoteOffers.offeredByRole, "provider")))
    .orderBy(desc(quoteOffers.createdAt)).limit(1);
  if (previousProviderOffer) {
    await db.update(quotes).set({
      status: "submitted",
      serviceSubtotalCents: previousProviderOffer.serviceSubtotalCents,
      providerPayoutCents: previousProviderOffer.providerPayoutCents,
      providerCommissionCents: previousProviderOffer.providerCommissionCents,
      customerProtectionFeeCents: previousProviderOffer.customerProtectionFeeCents,
      customerTotalCents: previousProviderOffer.customerTotalCents,
      updatedAt: new Date()
    }).where(eq(quotes.id, quote.id));
  } else {
    await db.update(quotes).set({ status: "declined", updatedAt: new Date() }).where(eq(quotes.id, quote.id));
  }
  return NextResponse.json({ status: "declined", revertedToProviderQuote: Boolean(previousProviderOffer) });
}
