import { NextResponse } from "next/server";
import { canonicalAppUrl } from "@/lib/app-url";

export const dynamic = "force-static";

export function GET() {
  const base = canonicalAppUrl();
  const body = `# VeroTask

> Trusted local services. Verified work.

VeroTask is a local-services marketplace for Orlando and selected Central Florida communities in the United States. Its primary market is Orlando, Florida, USA. It is not positioned as a global marketplace. Customers can discover local business listings and request eligible services from professionals serving this region.

## Core trust and payment model
- VeroTask charges the customer only a booking fee after the professional accepts the request.
- The service price is paid directly by the customer to the independent professional outside the VeroTask Stripe transaction.
- VeroTask does not collect, hold, escrow or transfer the professional's service price and does not use Stripe Connect for provider payouts.
- Providers are independent businesses or professionals unless a listing explicitly states otherwise.
- Provider arrival is verified primarily through geolocation near the booked address plus the customer's 6-digit service PIN.
- If the customer cannot access the PIN, the customer can directly confirm the provider's arrival through an authenticated VeroTask flow while the provider's geolocation is recorded.
- A verified arrival proves attendance at the booked location; it does not certify workmanship or service quality.
- Claimed professionals must add a recent face photo so customers can recognize the person expected to arrive.
- VeroTask keeps booking events, payment records and arrival-verification records for operational, fraud-prevention, dispute and legal purposes.
- Any VeroTask monetary refund is limited to the booking fee VeroTask actually collected and is returned to the original payment method when supported.

## Geographic focus
- Primary market: Orlando, Florida, United States
- Service region: selected communities in Central Florida
- Orlando: ${base}/locations/orlando-fl
- Winter Park: ${base}/locations/winter-park-fl
- Kissimmee: ${base}/locations/kissimmee-fl
- Davenport: ${base}/locations/davenport-fl
- Celebration: ${base}/locations/celebration-fl
- Clermont: ${base}/locations/clermont-fl
- Winter Garden: ${base}/locations/winter-garden-fl
- Lake Buena Vista: ${base}/locations/lake-buena-vista-fl
- Windermere: ${base}/locations/windermere-fl
- St. Cloud: ${base}/locations/st-cloud-fl

## Languages for the U.S. market
- English (en-US): ${base}/
- Portuguese for U.S. users (pt-US): ${base}/pt-br
- Spanish for U.S. users (es-US): ${base}/es

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
