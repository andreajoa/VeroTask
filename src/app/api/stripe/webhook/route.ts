import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getDb } from "@/db";
import { businesses, providerSubscriptions } from "@/db/schema";
import { PROVIDER_PLANS, type PlanKey } from "@/lib/plans";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

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

  const db = getDb();

  switch (event.type) {
    case "account.updated": {
      const account = event.data.object;
      const businessId = account.metadata?.verotask_business_id;
      if (!businessId) break;
      const ready = Boolean(account.details_submitted && account.payouts_enabled);
      await db.update(businesses).set({
        stripeConnectAccountId: account.id,
        stripeChargesEnabled: account.charges_enabled,
        stripePayoutsEnabled: account.payouts_enabled,
        status: ready ? "active" : "pending",
        updatedAt: new Date()
      }).where(eq(businesses.id, businessId));
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const businessId = subscription.metadata?.verotask_business_id;
      const plan = subscription.metadata?.verotask_plan as PlanKey | undefined;
      if (!businessId || !plan || !PROVIDER_PLANS[plan]) break;
      const active = subscription.status === "active" || subscription.status === "trialing";
      if (!active) break;

      await db.update(businesses).set({ plan, updatedAt: new Date() }).where(eq(businesses.id, businessId));
      await db.insert(providerSubscriptions).values({
        businessId,
        plan,
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0]?.price?.id,
        commissionBps: PROVIDER_PLANS[plan].commissionBps,
        active: true
      }).onConflictDoNothing();
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const businessId = subscription.metadata?.verotask_business_id;
      if (!businessId) break;
      await db.update(businesses).set({ plan: "free", updatedAt: new Date() }).where(eq(businesses.id, businessId));
      await db.update(providerSubscriptions).set({ active: false, updatedAt: new Date() }).where(eq(providerSubscriptions.stripeSubscriptionId, subscription.id));
      break;
    }
  }

  return NextResponse.json({ received: true });
}
