import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { businesses, users, providerSubscriptions } from "@/db/schema";
import { providerCheckoutSessions } from "@/db/operations-schema";
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
  const [subscription] = await db.select().from(providerSubscriptions).where(and(eq(providerSubscriptions.businessId, business.id), eq(providerSubscriptions.active, true))).limit(1);
  if (subscription?.stripeSubscriptionId) return NextResponse.json({ error: "subscription_already_active" }, { status: 409 });

  const stripe = getStripe();
  const [existing] = await db.select().from(providerCheckoutSessions).where(eq(providerCheckoutSessions.businessId, business.id)).limit(1);
  if (existing?.status === "open" && existing.expiresAt > new Date()) {
    const previous = await stripe.checkout.sessions.retrieve(existing.stripeSessionId);
    if (previous.status === "complete") return NextResponse.json({ error: "subscription_confirmation_pending" }, { status: 409 });
    if (previous.status === "open" && existing.plan === parsed.data.plan && previous.client_secret) return NextResponse.json({ client_secret: previous.client_secret, resumed: true });
    if (previous.status === "open") await stripe.checkout.sessions.expire(previous.id);
  }
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { verotask_user_id: user.id }
    }, { idempotencyKey: `verotask-customer-${user.id}` });
    customerId = customer.id;
    await db.update(users).set({ stripeCustomerId: customerId, updatedAt: new Date() }).where(eq(users.id, user.id));
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    mode: "subscription",
    customer: customerId,
    line_items: [{ quantity: 1, ...(priceId ? { price: priceId } : { price_data: {
      currency: "usd", unit_amount: PROVIDER_PLANS[parsed.data.plan].monthlyPriceCents,
      recurring: { interval: "month" as const }, product_data: { name: `VeroTask ${PROVIDER_PLANS[parsed.data.plan].name}` }
    } }) }],
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
  }, { idempotencyKey: `verotask-plan-${business.id}-${parsed.data.plan}-${existing?.stripeSessionId ?? "initial"}` });

  if (!session.client_secret) return NextResponse.json({ error: "missing_client_secret" }, { status: 500 });
  const expiresAt = new Date(session.expires_at * 1000);
  await db.insert(providerCheckoutSessions).values({ businessId: business.id, stripeSessionId: session.id, plan: parsed.data.plan, expiresAt })
    .onConflictDoUpdate({ target: providerCheckoutSessions.businessId, set: { stripeSessionId: session.id, plan: parsed.data.plan, status: "open", expiresAt, createdAt: new Date(), updatedAt: new Date() } });
  return NextResponse.json({ client_secret: session.client_secret });
}
