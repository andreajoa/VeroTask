import { NextResponse } from "next/server";
import { canonicalAppUrl } from "@/lib/app-url";

export const dynamic = "force-static";

export function GET() {
  const base = canonicalAppUrl();
  const body = `# VeroTask

> Trusted local services. Verified work.

VeroTask is a local-services marketplace focused initially on Orlando and Central Florida. Customers can discover public business listings and, for providers that have claimed and verified their profiles, request eligible services through VeroTask.

## Core trust and payment model
- VeroTask charges the customer only a booking fee after the professional accepts the request.
- The service price is paid directly by the customer to the independent professional outside the VeroTask Stripe transaction.
- VeroTask does not collect, hold, escrow or transfer the professional's service price and does not use Stripe Connect for provider payouts.
- Providers are independent businesses or professionals unless a listing explicitly states otherwise.
- A provider marking a job complete is not sufficient proof by itself.
- Service evidence may include geofenced check-in/check-out, customer PIN, before/after photos, checklist, timestamps and booking messages.
- Customers receive a 24-hour protection window after provider completion to confirm or report a problem.
- Eligible bookings may auto-complete after the protection window only when no dispute is open and required evidence is sufficient.
- Opening a dispute pauses booking completion while evidence is reviewed.
- Any VeroTask monetary refund is limited to the booking fee VeroTask actually collected and is returned to the original payment method when supported.

## Languages
- English: ${base}/
- Brazilian Portuguese: ${base}/pt-br
- Spanish: ${base}/es

## Important public resources
- Find services: ${base}/services
- Booking protection: ${base}/protection
- Sitemap: ${base}/sitemap.xml
- Robots: ${base}/robots.txt

## Listing transparency
Publicly sourced commercial listings are labeled as unclaimed until the business owner completes VeroTask claim/verification. Unclaimed listings cannot receive VeroTask marketplace booking requests.
`;
  return new NextResponse(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
