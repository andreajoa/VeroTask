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

## D1 full-application compatibility audit (2026-10-22)

An isolated complete application SQLite typecheck runs via `tsconfig.d1-app-port.json`, without changing production TypeScript aliases. It initially found 29 errors in 11 modules, mostly PostgreSQL transactions. Portable readiness probes and safe single-operation email enqueue reduced this to **27 errors in 9 transactional modules**. Strict D1 application portability is **not passing**. See `cloudflare/D1_APP_PORTABILITY.md` and `scripts/cloudflare/check_d1_app_port.mjs --strict`. This debt is tracked on an experimental branch rather than on production.

## Provider signups D1 staging test (2026-10-22)

The dedicated D1 provider-onboarding signed Worker operation was tested against synthetic records under concurrent requests; one business/category/user role transaction committed, the duplicate request returned the same business, unauthorized calls were rejected, and fake fixtures were removed. Real provider onboarding is explicitly DISABLED in D1 until authentication and all other database flows are ready. After factoring PostgreSQL and D1 provider creation into distinct implementations, the full D1 compatibility audit improved to **25 errors in 8 modules**.

## D1 provider decline staging test (2026-10-22)

The provider decline flow now has separate original PostgreSQL transaction and D1 Worker-backed atomic batch implementations. Two new SQLite tests prove idempotent cancellation and full rollback of booking status and event when notification enqueue fails. Worker real declining is intentionally disabled by default until data reconciliation. Remaining SQLite full-application compile debt: **23 diagnostics in 7 transaction modules**.

## D1 authentication staging verified (2026-10-22)

A genuine Cloudflare D1 private login flow now passes signed remote tests, including single-use magic links, atomic user/session creation, rate limits, token/session revocation and replay prevention. Tests only create fake `@example.invalid` identities; those fixtures were deleted. Production remains on PostgreSQL. See `cloudflare/D1_AUTH_STATUS.md` for the fail-closed rollout steps and blockers.

## D1 evidence audit (October 22, 2026)

The evidence API now has separate PostgreSQL/D1 atomic implementations. D1 adds unique R2 object references, in-batch authorization/status checks, and an atomic matching event. Twenty SQLite tests pass; full D1 app compilation remains blocked by **21 errors in 6 modules**. The evidence write endpoint is disabled by default in the Worker; this is not a customer release.

## Arrival request D1 port (October 22, 2026)

Provider arrival requests are now backend-abstracted into PostgreSQL and D1 atomic operations with geofence validation, three-state audit writes and email outbox rollback. 23 SQLite tests pass. D1 compilation remains blocked by **19 diagnostics in 5 transaction modules**. Production Worker write route remains disabled.

## Provider quote D1 transition (October 22, 2026)

Quote acceptance now has separate PostgreSQL and D1 conditional atomic adapters. New D1 tests verify exactly one quote event and queued email, required profile photo, and rollback on outbox constraint errors. The D1 Worker endpoint remains disabled for real clients. Remaining D1 compile debt: **17 diagnostics in 4 modules**.

## Fixed-price booking route port (October 22, 2026)

The fixed-price `/api/bookings/checkout` route now has a PostgreSQL-preserving adapter and a staged atomic D1 writer for new booking, PIN, audit and email. Three new SQLite tests pass; D1 full application compatibility still has **15 errors in 3 modules**. Real D1 new-booking operations remain DISABLED.

## D1 multi-quote request adaptation (October 22, 2026)

The quote-request route now has a separate D1 atomic backend for booking, PIN, price/discount event, privacy-preserving request event, and two notification queues. **32 SQLite tests and PostgreSQL source typecheck pass.** D1 source compatibility has **13 remaining diagnostics in two modules**, specifically live Stripe webhooks and dispute/refund workflow. The historical Neon 402 quota barrier and production runtime integration remain. No live write flags have been enabled.
