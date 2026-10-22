# D1 Application Portability Audit (October 22, 2026)

**Status: INCOMPLETE, NOT production-ready.**

This experimental branch compiles the **entire VeroTask Next.js source** with alias bindings pointing its `@/db/*` models at the generated SQLite models and `@/db` at the **read-only** Cloudflare D1 staging driver. This test does **not** modify the default production `tsconfig.json` or change its PostgreSQL deployment.

```bash
# Progress report (returns 0 if the 2026-10-22 baseline hasn't regressed):
node scripts/cloudflare/check_d1_app_port.mjs
# Strict release gate (must return 0 before ever enabling production D1):
node scripts/cloudflare/check_d1_app_port.mjs --strict
```

Original baseline: **27 remaining TypeScript diagnostics in 9 files**, all remaining in modules with PostgreSQL interactive transactions. The portable `/api/ready` schema check and standalone transactional-email enqueue were already refactored and tested. The known blockers are tracked in `scripts/cloudflare/d1-app-port-baseline.json`. The compile uses genuine D1 SQLite table types, not `any` aliases; absent `getTransactionalDb` is *intentional*, to prevent a false-positive compilation while payment, refund and booking atomicity are unimplemented.

This is a **minimum** gate. A clean compile does not guarantee correct semantics. Before production deployment all critical flows must be tested against the actual D1 database, including Stripe signed webhooks, concurrency, outbox delivery, customer/provider access control, reconciliation of original Neon rows, and rollback of failed migrations.

The D1 staging Worker is currently **read-only** for general application queries, with a narrow HMAC-protected synthetic settlement test. The live Neon database remains unavailable due to Free plan compute quota. Neither the old database nor customers' billing records can safely be replaced with an empty D1 database.

## Verified progress in this branch

- `/api/ready` now checks the actual nine essential tables through typed portable `SELECT … LIMIT 0` probes; the same Drizzle queries work on PG and D1 and read **zero private rows**. The real Cloudflare D1 staging database passed all nine queries; the former `to_regclass()` PostgreSQL dependency is gone.
- `enqueueBookingEmail` uses the ordinary database connection for its **single idempotent INSERT**, which does not require an interactive PostgreSQL transaction. Callers within larger PostgreSQL transactions still pass their own transactional writer into `queueBookingEmail`, preserving atomic notification intent.
- The original PostgreSQL application typecheck passed. The D1-specific portability check improved from 29 errors/11 files to **27 errors/9 files**.
- The nine remaining transaction modules must be rewritten as D1-native atomic statements/batches with tests before the strict gate passes.
