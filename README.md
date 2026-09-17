# VeroTask

**Trusted local services. Verified work.**

VeroTask is a production-oriented local-services marketplace for Orlando and Central Florida. Customers discover independent professionals, request a time, pay VeroTask a booking fee only after the professional accepts, complete the service directly with the professional, and build bilateral reputation through an auditable workflow.

## Official market and payment model

- Launch market: Orlando and Central Florida, United States.
- Marketplace currency: USD.
- Service timezone: America/New_York (Eastern Time).
- VeroTask does **not** use Stripe Connect and does not pay providers through Stripe.
- VeroTask charges the customer only the booking fee: 15% on Free providers, 10% on Pro, and 7% on Elite.
- The service price is paid directly by the customer to the independent professional outside the VeroTask Stripe transaction.
- Optional professional subscriptions are Free ($0/month), Pro ($39/month), and Elite ($99/month).

## Marketplace lifecycle

1. A customer selects a service, Orlando-area address and requested time.
2. VeroTask validates the professional's availability and schedule conflicts.
3. The request is created without charging the customer.
4. The professional reviews the request and the customer's VeroTask reputation.
5. The professional accepts or declines.
6. After acceptance, VeroTask charges only the applicable booking fee through Stripe Checkout.
7. A successful booking-fee payment changes the booking to scheduled.
8. The professional performs the service and the customer pays the service amount directly to the professional.
9. Check-in, PIN verification, evidence, checklist and check-out remain attached to the booking when required.
10. The professional marks the service complete; the customer can confirm completion or open a dispute during the protection window.
11. VeroTask records completion without any provider payout or Stripe transfer.
12. Customer and professional can rate one another after completion.

## Core stack

- Next.js 16 App Router + React 19 + TypeScript
- PostgreSQL / Neon
- Drizzle ORM + committed SQL migrations
- Stripe Payments + Stripe Billing (no Connect)
- Resend transactional email and CRM email
- S3-compatible private object storage / Cloudflare R2
- Tailwind CSS
- Vercel deployment and scheduled jobs
- English, Portuguese and Spanish public experience

## Production controls

- Passwordless magic-link authentication with single-use hashed tokens and request throttling
- Idempotent Stripe customer/session creation
- Stripe webhook-driven booking and subscription state
- Atomic booking-state transitions and overlap re-checks to reduce double-booking races
- Provider onboarding constrained to the Orlando/Central Florida launch area
- Private customer/provider messages tied to bookings
- Geo check-in/check-out, service PIN, evidence and checklist support
- Booking-fee refunds capped to the amount actually charged by VeroTask
- Bilateral reputation and operational trust metrics
- CRM automation and consent tracking
- Admin audit, evidence review, disputes and legal export surfaces
- `/api/health` for liveness and `/api/ready` for production readiness

## Provider plans

- Free: $0/month — customer booking fee 15%
- Pro: $39/month — customer booking fee 10%
- Elite: $99/month — customer booking fee 7%

The professional's service amount is not processed or transferred by VeroTask on any plan.

## Local launch area

Orlando, Winter Park, Kissimmee, Davenport, Celebration, Clermont, Winter Garden, Lake Buena Vista, Windermere and St. Cloud, Florida.

## Local development

```bash
cp .env.example .env.local
npm ci
npm run db:migrate
npm run db:seed
npm run dev
```

## Validation gate

Every release must pass:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

Before live promotion, also verify:

- `/api/ready` returns HTTP 200.
- `NEXT_PUBLIC_APP_URL` points to the intended public HTTPS production origin and is not a retired alias.
- Resend uses a verified VeroTask sender domain and magic-link delivery succeeds.
- Cloudflare R2/private S3 credentials can create signed evidence upload and download URLs.
- Stripe live credentials belong to the VeroTask account and the booking checkout charges only `marketplaceFeeCents` in USD.
- Pro/Elite subscription checkout uses USD recurring pricing.
- Stripe webhook delivery succeeds and duplicate events remain idempotent.
- A complete test booking succeeds: request → provider accept → booking-fee payment → scheduled → service evidence → completion → confirmation → ratings.
- Load tests are run against the production-equivalent deployment before high-volume promotion.

## Infrastructure scaling

The application is designed to stay stateless at the web tier so Vercel can scale horizontally. Neon is accessed through the serverless driver. Capacity claims must be validated against the actual production plan and deployment with load tests; repository correctness alone is not a substitute for runtime capacity validation.

## Production health

- `GET /api/health` — process liveness; does not expose secrets.
- `GET /api/ready` — checks required production environment, configured public HTTPS application URL and database connectivity. Returns HTTP 503 when the deployment is incomplete or still points to a retired production alias.

A green repository build does not mean third-party production configuration is automatically correct. Stripe, Resend, Neon, R2, domain/DNS and Vercel settings must match the live deployment before advertising to real customers.
