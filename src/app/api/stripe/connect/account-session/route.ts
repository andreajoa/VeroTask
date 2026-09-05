import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { businesses } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";

const bodySchema = z.object({ businessId: z.string().uuid() });

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const db = getDb();
  const [business] = await db.select().from(businesses).where(eq(businesses.id, parsed.data.businessId)).limit(1);
  if (!business || business.ownerUserId !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (business.status === "unclaimed" || business.status === "suspended") return NextResponse.json({ error: "business_not_eligible" }, { status: 409 });

  const stripe = getStripe();
  let accountId = business.stripeConnectAccountId;

  if (!accountId) {
    const account = await stripe.accounts.create({
      country: "US",
      email: user.email,
      controller: {
        fees: { payer: "application" },
        losses: { payments: "application" },
        stripe_dashboard: { type: "express" }
      },
      capabilities: {
        transfers: { requested: true }
      },
      business_profile: business.websiteUrl
        ? { url: business.websiteUrl }
        : { product_description: `${business.name} provides local services through the VeroTask marketplace.` },
      metadata: {
        verotask_business_id: business.id,
        verotask_user_id: user.id
      }
    });
    accountId = account.id;
    await db.update(businesses).set({ stripeConnectAccountId: accountId, updatedAt: new Date() }).where(eq(businesses.id, business.id));
  }

  const accountSession = await stripe.accountSessions.create({
    account: accountId,
    components: {
      account_onboarding: { enabled: true }
    }
  });

  return NextResponse.json({ client_secret: accountSession.client_secret });
}
