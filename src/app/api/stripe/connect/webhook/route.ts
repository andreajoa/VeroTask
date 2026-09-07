import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Stripe Connect is no longer used in the booking-fee model.
// This endpoint is kept to avoid 404s for any stale Stripe webhook configs.
export async function POST() {
  return NextResponse.json({ received: true, note: "connect_webhook_retired" });
}
