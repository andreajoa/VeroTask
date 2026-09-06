# VeroTask

**Trusted local services. Verified work.**

VeroTask is a production-oriented local-services marketplace for Orlando and Central Florida. It combines customer job requests, multi-provider matching, private quotes and counteroffers, bilateral reputation, protected payments, proof-of-service, private messaging, disputes, provider payouts, rewards, subscriptions, CRM automation, analytics and local SEO in one auditable workflow.

## Marketplace lifecycle

The core marketplace flow is intentionally bilateral and keeps the commercial record on-platform:

1. A customer publishes a service request with category, scope, address, requested time and optional budget guidance.
2. VeroTask matches qualified professionals using category, service area, current availability and reliability signals.
3. The exact street address and direct customer contact details remain private before booking.
4. Matched professionals can review the opportunity and send a private quote. Professionals never see competitors' quote prices.
5. A professional enters the amount they want to receive; VeroTask calculates the applicable provider-plan fee, customer service price and Vero Protection & Service Fee separately.
6. The customer compares quotes using price, rating, completed jobs and reliability signals, and can message or send a private counteroffer.
7. Pre-booking chat blocks obvious phone numbers, email addresses, external links, messaging networks and off-platform payment requests so the agreed scope and price remain documented.
8. The customer selects one quote. VeroTask atomically awards the request, reconfirms provider availability and creates the protected booking.
9. Vero Rewards credits, when available, are applied to the Vero Protection & Service Fee without reducing the provider's agreed payout.
10. Stripe Checkout collects the service amount and the net Vero Protection & Service Fee with a clear price breakdown.
11. A successful payment changes the booking to scheduled.
12. The provider performs check-in, PIN verification, optional before/after photos, checklist and check-out as required by the service.
13. The provider marks the service complete.
14. The customer can confirm completion or open a dispute during the 24-hour protection window.
15. Eligible undisputed bookings settle to the provider through Stripe Connect. Completed protected bookings can earn Vero Rewards.
16. Customer and provider can rate one another after an eligible completed booking.

A new customer or provider displays `5.00 ★ · New`; ranking separately tracks confidence, completed jobs and verified rating history so a new 5.0 is not treated as more proven than an established high-rated account.

## Vero Protect

Vero Protect applies when the quote, negotiation, booking and payment remain on VeroTask. The platform record supports no-show review, the 24-hour service issue window, dispute review and eligible full or partial refunds under the published marketplace rules.

Vero Protect is marketplace product protection and support. It is not represented as insurance, a bank account or a bank escrow service. Off-platform arrangements are not covered by Vero Protect.

## Vero Rewards

- First eligible completed protected booking: $5 platform credit.
- Later eligible completed protected bookings: 2% of the service price, minimum $2 and maximum $10 per booking.
- Credits are not cash and are applied to the Vero Protection & Service Fee on a later eligible booking.
- Credits redeemed on a booking are restored when that booking receives a full eligible refund.
- A booking that enters the dispute workflow does not automatically earn a completion reward.

## Core stack

- Next.js 16 App Router + React 19 + TypeScript
- PostgreSQL / Neon
- Drizzle ORM + committed SQL migrations
- Stripe Payments + Stripe Connect
- Resend transactional email and CRM email
- S3-compatible object storage / Cloudflare R2
- Tailwind CSS
- Vercel-compatible deployment and scheduled settlement cron
- English, Brazilian Portuguese and Spanish public experience

## Trust and marketplace controls

- Provider ownership / claim workflow
- Stripe Connect payout readiness before bookable status
- Customer ↔ provider bilateral reputation
- Multi-provider opportunity matching
- Private quotes with an enforced request quote cap
- Private customer counteroffers
- Competitor quote-price isolation
- Exact service-address privacy before quote award
- Pre-booking anti-circumvention messaging controls
- Weekly provider availability in Orlando / Eastern Time
- Availability recheck when a quote is awarded
- Atomic job award to prevent double hiring
- Secure payment only after quote selection
- Private customer/provider messages tied to the booking
- Geo check-in and check-out
- Customer service PIN
- Before/after evidence and checklist support
- 24-hour customer protection workflow after provider completion
- Dispute workflow that pauses normal settlement
- Refund and cancellation rules recorded as booking events
- Provider payout settlement and retry flow
- Vero Rewards ledger with idempotent earning/redemption events
- Saved professionals for repeat hiring
- Operational trust metrics beyond star rating
- Admin audit, evidence review, disputes and legal export surfaces

## Provider monetization

- Free: $0/month, 15% marketplace fee on completed bookings
- Pro: $39/month, 10% marketplace fee
- Elite: $99/month, 7% marketplace fee

The Vero Protection & Service Fee is a separate customer-facing fee. Its default configuration is 4.5% of the quoted service price, minimum $1.99 and maximum $19.99, configurable through environment variables. Provider plan economics and booking pricing snapshots are stored with marketplace records so historical amounts remain auditable.

## Local launch area

Orlando, Kissimmee, Davenport, Celebration, Clermont, Winter Garden, Lake Buena Vista, Windermere and St. Cloud.

## Initial service categories

Vacation-rental cleaning, pool service, HVAC, plumbing, electrical, handyman, pest control, lawn care, pressure washing, locksmith, appliance repair, furniture assembly, moving and junk removal.

## Local development

```bash
cp .env.example .env.local
npm ci
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

## Validation

Repository CI requires all of the following to pass:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

Committed Drizzle migrations are under `drizzle/` and are applied with:

```bash
npm run db:migrate
```

The multi-quote marketplace, Vero Protect pricing, rewards and favorites schema is introduced by `drizzle/0001_marketplace_quotes_rewards.sql`.

## Production health

- `GET /api/health` — process liveness, no secret disclosure.
- `GET /api/ready` — verifies required production configuration and database connectivity; returns HTTP 503 when the deployment is not ready.

## Production deployment

1. Provision PostgreSQL and set `DATABASE_URL`.
2. Run `npm run db:migrate` before deploying code that depends on the new schema. Run `npm run db:seed` only when seeding a new environment.
3. Configure all required environment variables from `.env.example`, including Vero Protect pricing overrides when different from defaults.
4. Configure Stripe, Stripe Connect and both webhook secrets.
5. Configure the transactional email domain/API key.
6. Configure private evidence storage when evidence uploads are enabled.
7. Deploy the repository and verify `/api/health` and `/api/ready`.
8. Perform a test-mode end-to-end marketplace transaction: request → matching → quote → counteroffer (optional) → quote selection → payment → scheduled → evidence → completion → confirmation → payout → rewards → bilateral ratings.
9. Test cancellation, full refund, dispute and no-show paths before enabling live payment credentials.
10. Enable live payment credentials only after the protected test-mode flows succeed.

## Project status

The application code is intended to be deployable as a complete production marketplace milestone. A repository being production-ready does **not** mean an external production environment is automatically live: database, Stripe/Connect, email, object storage, domain and hosting credentials must exist in the target environment, the committed migrations must be applied, and `/api/ready` must return HTTP 200 before real traffic or live payments are enabled.
