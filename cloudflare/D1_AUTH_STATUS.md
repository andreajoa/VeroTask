# VeroTask D1 login migration, isolated staging (October 22, 2026)

## What is implemented and remotely verified

- A signed Cloudflare Worker private auth endpoint with SQLite token issuance,
  one-time token consumption, user creation, session creation, session lookup,
  session revocation and unused-token revocation. No raw login token or session
  cookie is stored in D1; only SHA-256 hashes are persisted.
- A database trigger couples token consumption, user creation and session
  creation in **one SQLite statement/transaction**, protecting against partial
  logins and duplicate consumption. A per-email limit of five links per 15m
  is enforced in the issuing SQL INSERT itself.
- The Worker staging setting `D1_AUTH_STAGING_ENABLED=true` accepts ONLY
  `@example.invalid` test identities. Real email addresses are rejected even
  when callers hold the server-to-server signing key. The private flag
  `D1_AUTH_REAL_ENABLED` is **not configured** and must not be enabled until
  historic data are reconciled and all financial/booking routes are migrated.
- Existing Next.js authentication can be selected for D1 with **server-only**
  `AUTH_STORE=d1` plus private `D1_STAGING_HTTP_URL` and
  `D1_STAGING_BRIDGE_SECRET`. These variables are NOT configured in Vercel
  production. The default path remains the original PostgreSQL backend.
- Remote signed end-to-end check: issue -> consume once -> create user/session ->
  session validation -> logout -> replay rejected. Tested unused-token
  revocation and invalid redirect prevention. Fake data removed afterward.
- Eighteen local SQLite integrity tests pass, including five authentication
  tests: expiry, uniqueness, rate limit, atomic rollback and existing user.

## Important blockers before real customer login or payment

1. The original Neon project has historical records and is HTTP 402 quota
   suspended. Export and reconcile users, bookings, payments and identities
   BEFORE enabling live D1. NEVER point `www.verotask.online` at a clean D1
   database with no data from the old store.
2. Seven PostgreSQL transactional modules still need D1 porting. All routes
   using `@/db` outside login still connect to Neon in current production.
   Enabling the optional auth backend alone would allow a login but then lead
   to broken dashboards and bookings; that is NOT a completed migration.
3. End-to-end signed Stripe webhooks, settlement/refunds, Resend, audit and
   rollback require production-equivalent testing before allowing purchases.
4. Rotate previously exposed live credentials before the production cutover.

## Reproduction

```
python3 -m unittest discover -s cloudflare/d1/tests -q
npm run typecheck
npm test
# With privately configured staging HMAC (and only fake identities):
npx tsx scripts/cloudflare/verify_d1_auth.ts
```

Cloudflare D1's free quota allows initial operation without paying for idle
PostgreSQL compute, but quotas and non-database providers have separate
billing and terms. The Vercel Hobby plan is for non-commercial use only;
consider a compliant Cloudflare hosting deployment before paid operations.
