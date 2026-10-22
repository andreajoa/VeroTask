# D1 Application Portability Audit (October 22, 2026)

**Status: INCOMPLETE, NOT production-ready.**

This experimental branch compiles the **entire VeroTask Next.js source** with alias bindings pointing its `@/db/*` models at the generated SQLite models and `@/db` at the **read-only** Cloudflare D1 staging driver. This test does **not** modify the default production `tsconfig.json` or change its PostgreSQL deployment.

```bash
# Progress report (returns 0 if the 2026-10-22 baseline hasn't regressed):
node scripts/cloudflare/check_d1_app_port.mjs
# Strict release gate (must return 0 before ever enabling production D1):
node scripts/cloudflare/check_d1_app_port.mjs --strict
```

Original baseline: **10 remaining TypeScript diagnostics in 1 file**, all remaining in modules with PostgreSQL interactive transactions. The portable `/api/ready` schema check and standalone transactional-email enqueue were already refactored and tested. The known blockers are tracked in `scripts/cloudflare/d1-app-port-baseline.json`. The compile uses genuine D1 SQLite table types, not `any` aliases; absent `getTransactionalDb` is *intentional*, to prevent a false-positive compilation while payment, refund and booking atomicity are unimplemented.

This is a **minimum** gate. A clean compile does not guarantee correct semantics. Before production deployment all critical flows must be tested against the actual D1 database, including Stripe signed webhooks, concurrency, outbox delivery, customer/provider access control, reconciliation of original Neon rows, and rollback of failed migrations.

The D1 staging Worker is currently **read-only** for general application queries, with a narrow HMAC-protected synthetic settlement test. The live Neon database remains unavailable due to Free plan compute quota. Neither the old database nor customers' billing records can safely be replaced with an empty D1 database.

## Verified progress in this branch

- `/api/ready` now checks the actual nine essential tables through typed portable `SELECT … LIMIT 0` probes; the same Drizzle queries work on PG and D1 and read **zero private rows**. The real Cloudflare D1 staging database passed all nine queries; the former `to_regclass()` PostgreSQL dependency is gone.
- `enqueueBookingEmail` uses the ordinary database connection for its **single idempotent INSERT**, which does not require an interactive PostgreSQL transaction. Callers within larger PostgreSQL transactions still pass their own transactional writer into `queueBookingEmail`, preserving atomic notification intent.
- The original PostgreSQL application typecheck passed. The D1-specific portability check improved from 29 errors/11 files to **10 errors/1 file**.
- The nine remaining transaction modules must be rewritten as D1-native atomic statements/batches with tests before the strict gate passes.

## Provider onboarding progress (2026-10-22)

The provider signup action now delegates to backend-specific `@/db/transactional-provider` modules. PostgreSQL retains its original user-row lock and transactional writes. D1 has a dedicated signed RPC implementing business creation + category link + user role update in one atomic `D1Database.batch`, with owner uniqueness and idempotent retry. D1 remote staging tests with two concurrent fake signups passed; temporary fixtures were deleted.

The real D1 signup route is **disabled** unless the private Worker setting `D1_REAL_ONBOARDING_ENABLED=true` is explicitly provisioned **after** the full production launch gate. It is never enabled by this branch. The existing TypeScript D1 compatibility audit excludes only the PostgreSQL-only helper and includes the SQLite helper, so progress cannot be hidden by stubs. The D1 app still has **25 type errors across 8 transactional modules**.

## D1 provider decline adapter (2026-10-22)

A separate `@/db/transactional-decline` backend preserves the existing PostgreSQL transaction while D1 uses an authenticated Worker `D1Database.batch`: conditional booking cancellation, decline event, and idempotent customer notification are atomically written or rolled back together. Local SQLite tests verify exactly one event and outbox entry under replays and rollback when the outbox insert is rejected. The D1 real decline endpoint is disabled unless private `D1_REAL_DECLINES_ENABLED=true` is configured after full migration verification; this branch does not set that flag. D1 full app compile has **17 errors in 4 transactional modules**, strictly tracked in CI.

## Evidence record and audit trail port (October 22, 2026)

The `bookings/[id]/evidence` route now calls a backend-specific atomic writer. PostgreSQL retains the original row lock and transactional event. The Cloudflare D1 implementation uses one atomic `D1Database.batch` with permission-checked, state-checked evidence INSERT and a matching event INSERT only when evidence changed. The new `booking_evidence_unique_object_reference` index prevents attaching an uploaded image twice. Twenty SQLite integrity tests now pass, including role/state restrictions and duplicate photos; the original PostgreSQL source compilation passes. Real D1 evidence writes remain disabled without `D1_REAL_EVIDENCE_ENABLED=true`; no such live flag has been configured. Portability debt is now **10 errors in 1 module**. Evidence also still depends on R2 object verification and the existing Next.js authentication layer, which must be migrated completely before production use.

## Atomic provider arrival requests (October 22, 2026)

The `bookings/[id]/arrival-request` API now delegates the three database writes (geofence evidence, audit event, and customer email queue entry) to a backend-specific atomic writer. The existing PostgreSQL transaction is preserved. The D1 Worker recomputes geodesic distance from the stored job coordinates, checks the provider owner and customer address, enforces the service time window, and rate-limits requests to three in 30 minutes inside its conditional INSERT. The D1 batch atomically inserts evidence, event and outbox entry, rolling all back on unique-key or foreign-key errors. Three dedicated SQLite tests check rollback, rate limiting and cancelled bookings; 23 SQLite tests pass overall. The authenticated D1 Worker endpoint is **disabled** unless private `D1_REAL_ARRIVALS_ENABLED=true` is configured after the full production release gate. D1 application typecheck now has **19 errors in 5 remaining modules**.

## D1 provider quote acceptance (October 22, 2026)

The protected quote acceptance handler now uses a backend-specific atomic writer. The existing PostgreSQL transaction remains unchanged. The D1 Worker validates actor ownership, pending status, future scheduled time and an active verified provider photo before its conditional update; the D1 booking-overlap trigger rejects competing accepted bookings. A single batch either updates the booking fee/quote, writes the reputation + quote audit event and enqueues the customer's notification, or rolls all three back. Three SQLite tests verify idempotency, active photo requirement and outbox rollback; **26 SQLite tests** pass. The real D1 quote-acceptance endpoint is disabled unless `D1_REAL_QUOTES_ENABLED=true` is specifically configured after production release. D1 application compatibility now has **10 errors in 1 transaction module**.

## Fixed-price booking creation (October 22, 2026)

Customer fixed-price booking requests now have backend-specific atomic writers; the original PostgreSQL transaction remains in place. The signed D1 Worker performs a conditional INSERT with mandatory customer/provider/service checks and validates fee-only USD amounts against the selected tier (including permitted volume-rate discounts), service duration and location constraints. A single atomic batch generates the booking, service PIN hash, required event(s) and provider email queue. Local SQLite tests reject self-booking, provider suspension, past bookings and duplicate IDs; all related writes commit or roll back together. The D1 real booking creation route remains disabled by `D1_REAL_BOOKING_CREATE_ENABLED` (unset). With this port the full app D1 compilation has **10 errors in 1 module**. Next highest-risk priorities are quote-request, Stripe webhooks, and dispute settlement.

## D1 protected quote-request workflow (October 22, 2026)

The separate protected multi-quote request path now uses distinct PostgreSQL and D1 atomic booking writers. The D1 Worker validates customer/provider separation, launched Florida geography, optional service relationship, provider contact availability, schedule, service radius, database-side per-customer and per-provider request rate limits. One conditional booking INSERT and a D1 transaction record the PIN hash, optional volume-rate event, privacy-preserving quote event, provider notification and customer notification. Three targeted SQLite tests verify rate-limit, self-request, disabled provider and rollback. **32 SQLite tests** pass. The real request route is disabled unless the private `D1_REAL_QUOTE_REQUEST_ENABLED` flag is expressly enabled AFTER passing all historical-data and financial release gates; this branch does not enable it.

**ONLY TWO modules remain PostgreSQL-transaction-dependent in TypeScript:** `src/app/api/stripe/webhook/route.ts` and `src/lib/dispute-workflow.ts` (13 compiler diagnostics). These are high-risk financial, refund, dispute and recovery workflows; the absence of other TS errors is NOT permission to put the service into production. All CRUD reads/writes, provider subscriptions, transactional emails, auth, consent and dashboards still need full end-to-end runtime and Cloudflare hosting validation. PostgreSQL original data remain quota-locked.

## Verified Stripe booking-fee receipt staging (October 22, 2026)

The Stripe webhook `markBookingPaid` transaction was refactored into backend-specific adapters. The original PostgreSQL row-locking settlement/refund-write logic remains intact. The D1 Worker now has privately signed, **disabled-by-default** settlement and refund-confirmation endpoints. It validates a server-verified succeeded PaymentIntent's business/booking metadata, `amount_received`, USD currency and unique PaymentIntent ID against persisted booking data before scheduling. The existing D1 `booking_paid_receipt_once` trigger records the receipt and completes the checkout atomically. A captured booking fee arriving after cancellation is durably marked `payment_requires_refund` for replay/reconciliation; after a verified successful Stripe refund, a second atomic operation records the refund exactly once. **37 SQLite tests passed**, including mismatched amounts, duplicate deliveries, cancellation-after-payment, missing refund prerequisite and rollback after an injected event-write failure. The D1 real-money worker endpoint is OFF until data recovery, Stripe event signature checks, dispute and refund port, and production end-to-end tests have passed. Never mistake local synthetic payment success for live Stripe account confirmation.

The D1 source-compatibility audit now reports **10 TypeScript errors in the remaining dispute/refund workflow**. Full runtime migration/Cloudflare hosting and source dataset reconciliation remain unverified and not production ready.
