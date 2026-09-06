import { NextResponse } from "next/server";

export const dynamic = "force-static";

export function GET() {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "https://verotask.com").replace(/\/$/, "");
  const body = `# VeroTask

> Trusted local services. Verified work.

VeroTask is a local-services marketplace focused initially on Orlando and Central Florida. Customers can discover public business listings and, for providers that have claimed and verified their profiles, book and pay for eligible services through VeroTask.

## Core trust model
- Stripe-based marketplace payments.
- Providers are independent businesses or professionals unless a listing explicitly states otherwise.
- A provider marking a job complete is not sufficient proof by itself.
- Service evidence may include geofenced check-in/check-out, customer PIN, before/after photos, checklist, timestamps and booking messages.
- Customers receive a 24-hour protection window after provider completion to confirm or report a problem.
- Eligible bookings may auto-complete after the protection window only when no dispute is open and required evidence is sufficient.
- Opening a dispute pauses the normal pending payout workflow.
- Approved refunds are processed to the original payment method when supported.

## Languages
- English: ${base}/
- Brazilian Portuguese: ${base}/pt-br
- Spanish: ${base}/es

## Important public resources
- Find services: ${base}/services
- Payment protection: ${base}/protection
- Sitemap: ${base}/sitemap.xml
- Robots: ${base}/robots.txt

## Listing transparency
Publicly sourced commercial listings are labeled as unclaimed until the business owner completes VeroTask claim/verification. VeroTask does not accept protected marketplace payment for an unclaimed listing.
`;
  return new NextResponse(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
