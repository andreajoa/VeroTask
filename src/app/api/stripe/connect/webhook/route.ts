import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getDb } from "@/db";
import { businesses } from "@/db/schema";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: "connect_webhook_not_configured" }, { status: 400 });

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  if (event.type === "account.updated") {
    // Webhooks can arrive out of order: use the current Stripe account.
    const account = await getStripe().accounts.retrieve(event.data.object.id);
    const businessId = account.metadata?.verotask_business_id;
    if (businessId) {
      const transfers = account.capabilities?.transfers;
      const ready = Boolean(account.details_submitted && account.payouts_enabled && transfers === "active");
      const db = getDb();
      await db.update(businesses).set({
        stripeChargesEnabled: account.charges_enabled,
        stripePayoutsEnabled: account.payouts_enabled,
        status: sql`case when ${businesses.status} in ('suspended', 'paused', 'unclaimed') then ${businesses.status} else ${ready ? "active" : "pending"}::provider_status end`,
        updatedAt: new Date()
      }).where(and(eq(businesses.id, businessId), eq(businesses.stripeConnectAccountId, account.id)));
    }
  }

  return NextResponse.json({ received: true });
}
