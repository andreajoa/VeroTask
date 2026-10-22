# D1 Application Portability Audit (October 22, 2026)

**Status: INCOMPLETE, NOT production-ready.**

This experimental branch compiles the **entire VeroTask Next.js source** with alias bindings pointing its `@/db/*` models at the generated SQLite models and `@/db` at the **read-only** Cloudflare D1 staging driver. This test does **not** modify the default production `tsconfig.json` or change its PostgreSQL deployment.

```bash
# Progress report (returns 0 if the 2026-10-22 baseline hasn't regressed):
node scripts/cloudflare/check_d1_app_port.mjs
# Strict release gate (must return 0 before ever enabling production D1):
node scripts/cloudflare/check_d1_app_port.mjs --strict
```

Original baseline: **15 remaining TypeScript diagnostics in 3 files**, all remaining in modules with PostgreSQL interactive transactions. The portable `/api/ready` schema check and standalone transactional-email enqueue were already refactored and tested. The known blockers are tracked in `scripts/cloudflare/d1-app-port-baseline.json`. The compile uses genuine D1 SQLite table types, not `any` aliases; absent `getTransactionalDb` is *intentional*, to prevent a false-positive compilation while payment, refund and booking atomicity are unimplemented.

This is a **minimum** gate. A clean compile does not guarantee correct semantics. Before production deployment all critical flows must be tested against the actual D1 database, including Stripe signed webhooks, concurrency, outbox delivery, customer/provider access control, reconciliation of original Neon rows, and rollback of failed migrations.

The D1 staging Worker is currently **read-only** for general application queries, with a narrow HMAC-protected synthetic settlement test. The live Neon database remains unavailable due to Free plan compute quota. Neither the old database nor customers' billing records can safely be replaced with an empty D1 database.

## Verified progress in this branch

- `/api/ready` now checks the actual nine essential tables through typed portable `SELECT … LIMIT 0` probes; the same Drizzle queries work on PG and D1 and read **zero private rows**. The real Cloudflare D1 staging database passed all nine queries; the former `to_regclass()` PostgreSQL dependency is gone.
- `enqueueBookingEmail` uses the ordinary database connection for its **single idempotent INSERT**, which does not require an interactive PostgreSQL transaction. Callers within larger PostgreSQL transactions still pass their own transactional writer into `queueBookingEmail`, preserving atomic notification intent.
- The original PostgreSQL application typecheck passed. The D1-specific portability check improved from 29 errors/11 files to **15 errors/3 files**.
- The nine remaining transaction modules must be rewritten as D1-native atomic statements/batches with tests before the strict gate passes.

## Provider onboarding progress (2026-10-22)

The provider signup action now delegates to backend-specific `@/db/transactional-provider` modules. PostgreSQL retains its original user-row lock and transactional writes. D1 has a dedicated signed RPC implementing business creation + category link + user role update in one atomic `D1Database.batch`, with owner uniqueness and idempotent retry. D1 remote staging tests with two concurrent fake signups passed; temporary fixtures were deleted.

The real D1 signup route is **disabled** unless the private Worker setting `D1_REAL_ONBOARDING_ENABLED=true` is explicitly provisioned **after** the full production launch gate. It is never enabled by this branch. The existing TypeScript D1 compatibility audit excludes only the PostgreSQL-only helper and includes the SQLite helper, so progress cannot be hidden by stubs. The D1 app still has **25 type errors across 8 transactional modules**.

## D1 provider decline adapter (2026-10-22)

A separate `@/db/transactional-decline` backend preserves the existing PostgreSQL transaction while D1 uses an authenticated Worker `D1Database.batch`: conditional booking cancellation, decline event, and idempotent customer notification are atomically written or rolled back together. Local SQLite tests verify exactly one event and outbox entry under replays and rollback when the outbox insert is rejected. The D1 real decline endpoint is disabled unless private `D1_REAL_DECLINES_ENABLED=true` is configured after full migration verification; this branch does not set that flag. D1 full app compile has **17 errors in 4 transactional modules**, strictly tracked in CI.

## Evidence record and audit trail port (October 22, 2026)

The `bookings/[id]/evidence` route now calls a backend-specific atomic writer. PostgreSQL retains the original row lock and transactional event. The Cloudflare D1 implementation uses one atomic `D1Database.batch` with permission-checked, state-checked evidence INSERT and a matching event INSERT only when evidence changed. The new `booking_evidence_unique_object_reference` index prevents attaching an uploaded image twice. Twenty SQLite integrity tests now pass, including role/state restrictions and duplicate photos; the original PostgreSQL source compilation passes. Real D1 evidence writes remain disabled without `D1_REAL_EVIDENCE_ENABLED=true`; no such live flag has been configured. Portability debt is now **15 errors in 3 modules**. Evidence also still depends on R2 object verification and the existing Next.js authentication layer, which must be migrated completely before production use.

## Atomic provider arrival requests (October 22, 2026)

The `bookings/[id]/arrival-request` API now delegates the three database writes (geofence evidence, audit event, and customer email queue entry) to a backend-specific atomic writer. The existing PostgreSQL transaction is preserved. The D1 Worker recomputes geodesic distance from the stored job coordinates, checks the provider owner and customer address, enforces the service time window, and rate-limits requests to three in 30 minutes inside its conditional INSERT. The D1 batch atomically inserts evidence, event and outbox entry, rolling all back on unique-key or foreign-key errors. Three dedicated SQLite tests check rollback, rate limiting and cancelled bookings; 23 SQLite tests pass overall. The authenticated D1 Worker endpoint is **disabled** unless private `D1_REAL_ARRIVALS_ENABLED=true` is configured after the full production release gate. D1 application typecheck now has **19 errors in 5 remaining modules**.

## D1 provider quote acceptance (October 22, 2026)

The protected quote acceptance handler now uses a backend-specific atomic writer. The existing PostgreSQL transaction remains unchanged. The D1 Worker validates actor ownership, pending status, future scheduled time and an active verified provider photo before its conditional update; the D1 booking-overlap trigger rejects competing accepted bookings. A single batch either updates the booking fee/quote, writes the reputation + quote audit event and enqueues the customer's notification, or rolls all three back. Three SQLite tests verify idempotency, active photo requirement and outbox rollback; **26 SQLite tests** pass. The real D1 quote-acceptance endpoint is disabled unless `D1_REAL_QUOTES_ENABLED=true` is specifically configured after production release. D1 application compatibility now has **15 errors in 3 transaction modules**.

## Fixed-price booking creation (October 22, 2026)

Customer fixed-price booking requests now have backend-specific atomic writers; the original PostgreSQL transaction remains in place. The signed D1 Worker performs a conditional INSERT with mandatory customer/provider/service checks and validates fee-only USD amounts against the selected tier (including permitted volume-rate discounts), service duration and location constraints. A single atomic batch generates the booking, service PIN hash, required event(s) and provider email queue. Local SQLite tests reject self-booking, provider suspension, past bookings and duplicate IDs; all related writes commit or roll back together. The D1 real booking creation route remains disabled by `D1_REAL_BOOKING_CREATE_ENABLED` (unset). With this port the full app D1 compilation has **15 errors in 3 modules**. Next highest-risk priorities are quote-request, Stripe webhooks, and dispute settlement.
