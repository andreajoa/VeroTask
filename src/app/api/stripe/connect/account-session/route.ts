import { NextResponse } from "next/server";

// Stripe Connect onboarding is no longer used in the booking-fee model.
export async function POST() {
  return NextResponse.json({ error: "connect_onboarding_retired" }, { status: 410 });
}
