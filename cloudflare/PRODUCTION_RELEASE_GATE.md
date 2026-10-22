# VeroTask Cloudflare D1 production release gate

Assessment: **NO_GO** on **22 October 2026**.

## Verified with actual endpoints and automated checks

- Production `https://www.verotask.online/`: HTTP 200, page served.
- Production `/api/health`: HTTP 200, process alive.
- Production `/api/ready`: HTTP 503, database and schema not ready.
- Production `/api/monitoring/stripe-webhook` without credentials: HTTP 500. A healthy unauthenticated endpoint should reject with HTTP 401; the 500 is a failed check, not proof of webhook delivery.
- Login gates: `/dashboard` and `/admin` redirect to sign-in, HTTP 307.
- GET `/api/stripe/webhook`: HTTP 405; this does not test the signed POST or payment delivery.
- Production sitemap: HTTP 200.
- Cloudflare `verotask-d1-staging` health: HTTP 200, 43 app tables; no customer data; read-only signed D1 proxy validated.
- Production has the Vercel project's 34 environment variables and verified domains, inherited from the project transfer.
- Cloudflare D1 staging has 43 tables, 85 indexes, 64 foreign keys, 32 enum triggers and two **timezone-safe** booking interval triggers. Local SQLite tests include concurrent scheduling contention.
- Local source typecheck, production build, 71 existing unit tests and Cloudflare staging schema/type tests passed.
- Neon production database currently returns HTTP 402 for quota. Storage exists; no usable database snapshot was found via Neon snapshot listing. **Existing records must not be discarded.**

## Mandatory hard blockers to remove before changing production traffic

1. **Recover and back up all original Neon rows** after restoring compute capacity. The application has historical paid-booking events; an empty D1 database must never replace this database. Secure, encrypted export with documented rollback; verify every table's row count, data hashes for critical tables and Stripe identities.
2. **Refactor ~96 DB-calling application modules** to actual SQLite Drizzle model references and D1 query semantics. The existing production accessors use Neon HTTP and PostgreSQL sessions. A signed *read-only* D1 bridge and generated type models are not a production port.
3. **Replace PostgreSQL interactive transactions and `FOR UPDATE`** with an audited, atomic D1 write design across quote requests, provider acceptance, Stripe payments, refunds, disputes, booking evidence and email outbox. A schema constraint alone cannot prove transactional correctness.
4. **Payment gate**: replay signed Stripe event payloads on staging, including out-of-order delivery, retries and concurrent duplicates, and prove booking fees only are charged; reconcile amounts, refunds, events, PIN and address release. Never mark `scheduled` based on a browser redirect.
5. **Operational gate**: Resend magic-link login and transactional email; Cloudflare R2 signed uploads; admin authorization; CRM consent; webhook monitor with authorized credential; cron recovery; error handling and request timeouts.
6. **E2E gate**: staging full booking and settlement with Stripe test mode and synthetic customers/professionals, competing bookings, cancellations, refunds and disputes. Before accepting money live, perform tightly controlled live payment verification and inspect Stripe transaction, webhook and DB states.
7. **Cutover gate**: deploy final code behind separate protected staging URL, restore customer data, verify `/api/ready` and all payment tests, configure a rollback and DNS/deployment change plan, then route production. Post-cutover continuous health and webhook monitoring is mandatory.

## How to reproduce read-only status

```
python3 scripts/cloudflare/production_gate.py
python3 -m unittest discover -s cloudflare/d1/tests -v
npm run typecheck
npm run lint
npm test
npm run build
```

An HTTP 200 from the homepage is **not** enough to approve production. No credentials, card information, customer exports, or live tokens belong in this report.

## Stripe Dashboard cross-check (2026-10-22)

- Verified in the authenticated **VeroTask** live Stripe Dashboard in Chrome.
- Production webhook destination is **Active** and points to `https://www.verotask.online/api/stripe/webhook`, listening to nine event types.
- The webhook's overview displayed 0 deliveries and 0 failures for *this week* (a 0% error indicator is not evidence of recent successful deliveries); the delivery tab currently displayed no deliveries.
- Stripe Transactions shows one successful live **USD $1.50** payment on 2026-09-21. This confirms Stripe collected it, not that today's production DB can record new payments.
- Existing Stripe catalog products VeroTask Pro and Elite are **BRL 39/month and BRL 99/month**, while the Orlando marketplace publicly displays **USD $39/month and USD $99/month**. Vercel currently has no `STRIPE_PRICE_PRO_USD_MONTHLY` / `STRIPE_PRICE_ELITE_USD_MONTHLY` env keys.
- The existing provider *plan-change* server action referenced legacy `STRIPE_PRICE_PRO_MONTHLY` / `STRIPE_PRICE_ELITE_MONTHLY`, risking BRL billing inconsistent with UI. This staging branch changes that path to **USD-specific env keys only** and requires Stripe Price verification (active, USD, monthly, correct amount). New-subscription Checkout similarly validates any configured USD price.
- To enable live plan upgrades/downgrades, create verified USD recurring prices ($39/$99) in Stripe and securely configure both USD price IDs in Vercel. **Do not** modify existing subscriptions until their billing currency and proration are reviewed. The old BRL prices can remain for historical reconciliation.

No live charges, refunds, transfers, or subscription changes were executed during this Stripe audit. Live purchase processing is **NO-GO** while the Neon production database is suspended.
