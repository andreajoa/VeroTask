# VeroTask

**Trusted local services. Verified work.**

VeroTask is a local-services marketplace designed for Orlando and Central Florida, with protected payments, proof-of-service, transparent disputes, provider subscriptions, and local SEO built into the product.

## Core stack

- Next.js App Router + TypeScript
- Vercel
- Neon PostgreSQL
- Drizzle ORM
- Stripe + Stripe Connect
- Tailwind CSS
- Server-side i18n: English (default), Brazilian Portuguese, Spanish

## Product principles

1. Providers can join without the marketplace being empty: public business profiles can be imported from lawful public/commercial sources and later claimed by verified owners.
2. A provider marking a job complete does not by itself release funds.
3. Completion evidence can include geolocation, timestamps, customer PIN, before/after photos, job checklist, and messages.
4. Customers have a 24-hour protection window after provider completion. If no dispute is opened and evidence requirements are met, the booking auto-completes and provider payout becomes eligible.
5. Disputes freeze the pending transfer until resolution.
6. Refund rules are displayed before checkout and are auditable by booking event history.
7. Provider rankings use operational reliability, not only star ratings.

## Initial monetization

- Free: $0/month, 15% marketplace fee on completed bookings
- Pro: $39/month, 10% marketplace fee
- Elite: $99/month, 7% marketplace fee

Subscription benefits and commission rates are data-driven and configurable.

## Local launch area

- Orlando
- Kissimmee
- Davenport
- Celebration
- Clermont
- Winter Garden
- Lake Buena Vista
- Windermere
- St. Cloud

## Initial service categories

- Vacation rental / Airbnb cleaning
- Pool service
- HVAC
- Plumbing
- Electrical
- Handyman
- Pest control
- Lawn care
- Pressure washing
- Locksmith
- Appliance repair
- Furniture assembly
- Moving
- Junk removal

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production

Connect this repository to Vercel and configure the environment variables described in `.env.example`. Neon is used for PostgreSQL. Stripe Connect is used for provider onboarding and marketplace payouts.

## Status

Production foundation under active development.
