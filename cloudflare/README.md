# Cloudflare D1 migration staging, not production

The VeroTask PostgreSQL backend cannot be switched to Cloudflare D1 by changing `DATABASE_URL`.
D1 uses SQLite SQL and Workers bindings; the existing production app uses Drizzle PostgreSQL schemas,
Neon HTTP and pg sessions, row locking, exclusion constraints and interactive booking transactions.

## Implemented in this isolated branch

- `verotask-migration-staging`: separate Cloudflare D1 database (Eastern North America), no customer data.
- `d1/0001_schema.sql`: generated SQLite schema for the 43 PostgreSQL tables, with 85 indexes,
  64 foreign keys and two basic overlapping-booking triggers.
- `d1/0002_enum_guards.sql`: 32 SQLite triggers enforcing PostgreSQL enum domains.
- `d1/tests/test_schema.py`: offline SQLite tests for schema, UUIDs, uniqueness, FKs and overlapping bookings.
- `worker/index.ts`: deliberately restricted Worker health endpoint; no public SQL/query API.

Commands:

```sh
python3 scripts/cloudflare/generate_d1_schema.py
python3 scripts/cloudflare/generate_d1_enum_guards.py
python3 -m unittest discover -s cloudflare/d1/tests -v
wrangler d1 execute verotask-migration-staging --remote --file cloudflare/d1/0001_schema.sql
wrangler d1 execute verotask-migration-staging --remote --file cloudflare/d1/0002_enum_guards.sql
wrangler deploy --config cloudflare/wrangler.toml
```

## Required before any production change

1. Restore access to the existing Neon database, currently returning HTTP 402 for compute quota.
   Export its tables and verify counts, binary evidence references and application records.
2. Replace PostgreSQL Drizzle schema and query paths with SQLite-aware typed models; rewrite
   booking and payment logic for D1's atomic `batch` constraints, rather than interactive pg transactions.
3. Reassess all constraints: custom PostgreSQL enums, PG GiST exclusion, time-zone semantics,
   JSON operations, UUID/default values and any stored procedures. Staging triggers are not
   a substitute for an audited concurrency and money-flow design.
4. Deploy the new backend behind protected staging endpoints and run integration tests for signup,
   login/magic-links, booking creation, double-booking under concurrency, Stripe webhooks and
   idempotency, plan renewals, refunds, disputes, Resend and Cloudflare R2.
5. Reconcile all PostgreSQL row counts, relationships and payments with imported D1 rows, and
   arrange rollback before changing production traffic. Keep the existing Neon project intact.

Do not assign `www.verotask.online` to this Worker or configure production `DATABASE_URL` with D1.

## Type-safe read-only bridge (2026-10-22)

This branch also includes automatically generated Drizzle SQLite models (`src/db/sqlite/*-schema.ts`),
a typed compatibility layer (`src/db/sqlite/compat.ts`), an HTTP SQLite proxy
(`src/db/sqlite/proxy.ts`), and a signed Cloudflare Worker endpoint for **read-only**
parameterized queries. The endpoint requires a shared HMAC-SHA256 secret stored as
`DB_BRIDGE_SECRET` in the Worker and `D1_STAGING_BRIDGE_SECRET` on the testing server.
Both names refer to the same private secret, which must never be committed or exposed
under `NEXT_PUBLIC_*`. The server must configure
`D1_STAGING_HTTP_URL=https://verotask-d1-staging.andrealmeidashop.workers.dev`.

To verify with a privately configured staging secret:

```sh
python3 scripts/cloudflare/generate_d1_drizzle_schema.py
npx tsc --noEmit --project tsconfig.cloudflare-d1.json
# The following requires staging-only secret/environment variables:
npx tsx scripts/cloudflare/verify_d1_bridge.ts
```

The Worker intentionally rejects DML, DDL, unsafe SQL, unauthenticated requests,
and non-parameterized access outside the signed bridge. This is **not** the final
application backend. Existing VeroTask routes still reference PostgreSQL tables;
`getTransactionalDb()` still uses PostgreSQL interactive transactions. Do not switch
`DATABASE_DRIVER` or production traffic to the bridge. Before enabling any writes,
rewrite and test the full Stripe booking-fee reconciliation workflow under D1
atomic batches and protect every settlement against concurrency/replay.

No production customer, provider or payment data is present in staging, and no
existing Stripe webhook or Vercel environment variable has been modified.
