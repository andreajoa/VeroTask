import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { businesses, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { PROVIDER_PLANS } from "@/lib/plans";
import { getStripe } from "@/lib/stripe";

const schema = z.object({
  businessId: z.string().uuid(),
  plan: z.enum(["pro", "elite"])
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const db = getDb();
  const [business] = await db.select().from(businesses).where(eq(businesses.id, parsed.data.businessId)).limit(1);
  if (!business || business.ownerUserId !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const priceId = parsed.data.plan === "pro" ? process.env.STRIPE_PRICE_PRO_MONTHLY : process.env.STRIPE_PRICE_ELITE_MONTHLY;
  if (!priceId) return NextResponse.json({ error: "price_not_configured" }, { status: 503 });

  const stripe = getStripe();
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { verotask_user_id: user.id }
    });
    customerId = customer.id;
    await db.update(users).set({ stripeCustomerId: customerId, updatedAt: new Date() }).where(eq(users.id, user.id));
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    return_url: `${baseUrl}/dashboard/providers/${business.id}/billing/return?session_id={CHECKOUT_SESSION_ID}`,
    subscription_data: {
      metadata: {
        verotask_business_id: business.id,
        verotask_plan: parsed.data.plan
      }
    },
    metadata: {
      verotask_business_id: business.id,
      verotask_plan: parsed.data.plan,
      monthly_price_cents: String(PROVIDER_PLANS[parsed.data.plan].monthlyPriceCents)
    }
  });

  if (!session.client_secret) return NextResponse.json({ error: "missing_client_secret" }, { status: 500 });
  return NextResponse.json({ client_secret: session.client_secret });
}
