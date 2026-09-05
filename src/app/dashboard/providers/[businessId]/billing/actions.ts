"use server";

import { and, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { businesses, providerSubscriptions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { PROVIDER_PLANS, type PlanKey } from "@/lib/plans";
import { getStripe } from "@/lib/stripe";

async function ownedBusiness(businessId: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/dashboard/providers/${businessId}/billing`)}`);
  const db = getDb();
  const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
  if (!business || business.ownerUserId !== user.id) redirect("/dashboard");
  return { user, business, db };
}

export async function scheduleFreePlan(businessId: string) {
  const { business, db } = await ownedBusiness(businessId);
  if (business.plan === "free") redirect(`/dashboard/providers/${businessId}/billing?notice=already-free`);

  const [active] = await db.select().from(providerSubscriptions).where(and(
    eq(providerSubscriptions.businessId, businessId),
    eq(providerSubscriptions.active, true)
  )).orderBy(desc(providerSubscriptions.createdAt)).limit(1);

  if (active?.stripeSubscriptionId) {
    await getStripe().subscriptions.update(active.stripeSubscriptionId, { cancel_at_period_end: true });
    await db.update(providerSubscriptions).set({ cancelAtPeriodEnd: true, updatedAt: new Date() }).where(eq(providerSubscriptions.id, active.id));
    redirect(`/dashboard/providers/${businessId}/billing?notice=downgrade-scheduled`);
  }

  await db.update(businesses).set({ plan: "free", updatedAt: new Date() }).where(eq(businesses.id, businessId));
  redirect(`/dashboard/providers/${businessId}/billing?notice=free-enabled`);
}

export async function changePaidPlan(businessId: string, plan: Exclude<PlanKey, "free">) {
  const { business, db } = await ownedBusiness(businessId);
  if (business.plan === plan) redirect(`/dashboard/providers/${businessId}/billing?notice=already-current`);

  const [active] = await db.select().from(providerSubscriptions).where(and(
    eq(providerSubscriptions.businessId, businessId),
    eq(providerSubscriptions.active, true)
  )).orderBy(desc(providerSubscriptions.createdAt)).limit(1);

  if (!active?.stripeSubscriptionId) redirect(`/dashboard/providers/${businessId}/billing?plan=${plan}`);

  const priceId = plan === "pro" ? process.env.STRIPE_PRICE_PRO_MONTHLY : process.env.STRIPE_PRICE_ELITE_MONTHLY;
  if (!priceId) redirect(`/dashboard/providers/${businessId}/billing?error=price-not-configured`);

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(active.stripeSubscriptionId);
  const item = subscription.items.data[0];
  if (!item) redirect(`/dashboard/providers/${businessId}/billing?error=subscription-item-missing`);

  await stripe.subscriptions.update(subscription.id, {
    items: [{ id: item.id, price: priceId }],
    proration_behavior: "create_prorations",
    cancel_at_period_end: false,
    metadata: {
      verotask_business_id: businessId,
      verotask_plan: plan
    }
  });

  await db.update(businesses).set({ plan, updatedAt: new Date() }).where(eq(businesses.id, businessId));
  await db.update(providerSubscriptions).set({
    plan,
    stripePriceId: priceId,
    commissionBps: PROVIDER_PLANS[plan].commissionBps,
    cancelAtPeriodEnd: false,
    updatedAt: new Date()
  }).where(eq(providerSubscriptions.id, active.id));

  redirect(`/dashboard/providers/${businessId}/billing?notice=plan-updated`);
}
