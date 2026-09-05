import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getDb } from "@/db";
import { businesses, providerSubscriptions } from "@/db/schema";
import { PROVIDER_PLANS, type PlanKey } from "@/lib/plans";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

async function upsertProviderSubscription(subscription: Stripe.Subscription) {
  const businessId = subscription.metadata?.verotask_business_id;
  const plan = subscription.metadata?.verotask_plan as PlanKey | undefined;
  if (!businessId || !plan || !PROVIDER_PLANS[plan]) return;

  const db = getDb();
  const active = subscription.status === "active" || subscription.status === "trialing";
  const priceId = subscription.items.data[0]?.price?.id;
  const [existing] = await db.select().from(providerSubscriptions)
    .where(eq(providerSubscriptions.stripeSubscriptionId, subscription.id))
    .limit(1);

  if (existing) {
    await db.update(providerSubscriptions).set({
      plan,
      stripePriceId: priceId,
      commissionBps: PROVIDER_PLANS[plan].commissionBps,
      active,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: new Date()
    }).where(eq(providerSubscriptions.id, existing.id));
  } else {
    await db.insert(providerSubscriptions).values({
      businessId,
      plan,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      commissionBps: PROVIDER_PLANS[plan].commissionBps,
      active,
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    });
  }

  if (active) {
    await db.update(businesses).set({ plan, updatedAt: new Date() }).where(eq(businesses.id, businessId));
  }
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: "webhook_not_configured" }, { status: 400 });

  const stripe = getStripe();
  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await upsertProviderSubscription(event.data.object);
      break;

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const businessId = subscription.metadata?.verotask_business_id;
      if (!businessId) break;
      const db = getDb();
      await db.update(businesses).set({ plan: "free", updatedAt: new Date() }).where(eq(businesses.id, businessId));
      await db.update(providerSubscriptions).set({ active: false, updatedAt: new Date() }).where(eq(providerSubscriptions.stripeSubscriptionId, subscription.id));
      break;
    }
  }

  return NextResponse.json({ received: true });
}
