# Cloudflare D1 migration staging, not production

The VeroTask PostgreSQL backend cannot be switched to Cloudflare D1 by changing `DATABASE_URL`.
D1 uses SQLite SQL and Workers bindings; the existing production app uses Drizzle PostgreSQL schemas,
Neon HTTP and pg sessions, row locking, exclusion constraints and interactive booking transactions.

## Implemented in this isolated branch

- `verotask-migration-staging`: separate Cloudflare D1 database (Eastern North America), no customer data.
- `d1/0001_schema.sql`: generated SQLite schema for the 43 PostgreSQL tables, with 85 indexes,
  64 foreign keys and two basic overlapping-booking triggers.
- `d1/tests/test_schema.py`: offline SQLite tests for schema, UUIDs, uniqueness, FKs and overlapping bookings.
- `worker/index.ts`: deliberately restricted Worker health endpoint; no public SQL/query API.

Commands:

```sh
python3 scripts/cloudflare/generate_d1_schema.py
python3 -m unittest discover -s cloudflare/d1/tests -v
wrangler d1 execute verotask-migration-staging --remote --file cloudflare/d1/0001_schema.sql
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
