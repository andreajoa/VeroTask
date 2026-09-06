# VeroTask

**Trusted local services. Verified work.**

VeroTask is a production-oriented local-services marketplace for Orlando and Central Florida. It combines provider discovery, bilateral reputation, provider-controlled job acceptance, protected payments, proof-of-service, private booking messages, disputes, provider payouts, subscriptions, CRM automation, analytics, and local SEO in one auditable workflow.

## Marketplace lifecycle

The core transaction flow is intentionally bilateral:

1. A customer chooses a service, address and requested time.
2. VeroTask checks provider hours and schedule conflicts.
3. The request is created without charging the customer.
4. The provider sees the customer's VeroTask reputation and job history before deciding.
5. The provider accepts or declines the request.
6. Only after acceptance is the customer invited to complete secure Stripe payment.
7. A successful payment changes the booking to scheduled.
8. The provider performs check-in, PIN verification, optional before/after photos, checklist and check-out as required by the service.
9. The provider marks the service complete.
10. The customer can confirm completion or open a dispute during the protection window.
11. Eligible bookings settle to the provider through Stripe Connect.
12. Customer and provider can rate one another after a completed booking.

A new customer or provider displays `5.00 ★ · New`; the ranking system separately tracks confidence, completed jobs and verified rating history so a new 5.0 is not treated as more proven than an established high-rated account.

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
- Customer reputation visible to the provider before acceptance
- Weekly provider availability in Orlando / Eastern Time
- Accepted jobs reserve the provider schedule before payment
- Private customer/provider messages tied to the booking
- Geo check-in and check-out
- Customer service PIN
- Before/after evidence and checklist support
- 24-hour customer protection workflow after provider completion
- Dispute workflow that pauses normal settlement
- Refund and cancellation rules recorded as booking events
- Provider payout settlement and retry flow
- Operational trust metrics beyond star rating
- Admin audit, evidence review, disputes and legal export surfaces

## Provider monetization

- Free: $0/month, 15% marketplace fee on completed bookings
- Pro: $39/month, 10% marketplace fee
- Elite: $99/month, 7% marketplace fee

Subscription state and fee snapshots are stored with the relevant marketplace records so historical economics remain auditable.

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

The repository CI runs the same deterministic dependency graph from `package-lock.json` and requires all of the following to pass:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

The committed Drizzle migration is under `drizzle/` and can be applied with:

```bash
npm run db:migrate
```

## Production health

- `GET /api/health` — process liveness, no secret disclosure.
- `GET /api/ready` — verifies required production configuration and database connectivity; returns HTTP 503 when the deployment is not ready.

## Production deployment

1. Provision PostgreSQL and set `DATABASE_URL`.
2. Run `npm run db:migrate`, then `npm run db:seed` when seeding a new environment.
3. Configure all required environment variables from `.env.example`.
4. Configure Stripe, Stripe Connect and both webhook secrets.
5. Configure the transactional email domain/API key.
6. Configure private evidence storage when evidence uploads are enabled.
7. Deploy the repository and verify `/api/health` and `/api/ready`.
8. Perform a test-mode end-to-end booking: request → provider accept → payment → scheduled → evidence → completion → confirmation → bilateral ratings.
9. Enable live payment credentials only after the test-mode transaction succeeds.

## Project status

The application code is intended to be deployable as a complete production marketplace milestone. A repository being production-ready does **not** mean an external production environment is automatically live: database, Stripe/Connect, email, object storage, domain and hosting credentials must exist in the target environment, and `/api/ready` must return HTTP 200 before real traffic or live payments are enabled.
