import { NextResponse } from "next/server";

// VeroTask does not use Stripe Connect. Customers pay only the marketplace
// booking fee to VeroTask; the service amount is paid directly to the provider.
export async function POST() {
  return NextResponse.json({ error: "connect_not_used" }, { status: 410 });
}
