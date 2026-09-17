import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Stripe Connect is intentionally not part of the VeroTask payment model.
export async function POST() {
  return NextResponse.json({ received: false, error: "connect_not_used" }, { status: 410 });
}
