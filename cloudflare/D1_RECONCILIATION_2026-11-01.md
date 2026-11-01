# VeroTask Neon → D1: recovery and reconciliation checkpoint (2026-11-01)

**Migration status: NO-GO.** This is a read-only, metadata-level comparison, not a data migration or a certification of Stripe flows. The original Neon database and live payment settings were not changed.

## Recovery and backups

- Neon project `young-voice-48239180`, primary branch `br-sweet-cell-aum9cetl`, renewed billing/consumption period `2026-11-01T00:00:00Z` to `2026-12-01T00:00:00Z`. An actual SQL query at `2026-11-01T11:37:42Z` succeeded and returned **43 public tables**.
- Manual Neon snapshot `snap-muddy-tree-auhem3sd` (`verotask-pre-d1-migration-2026-11-01`) created `2026-11-01T11:41:10Z` and subsequently listed by the Neon API; reported snapshot size **42,696,704 bytes**. This is a provider-side recovery point, **not** an independently downloaded logical export.
- Before any import, the D1 staging database was exported with Wrangler to a local private backup `~/Documents/VeroTask/backups/d1-staging-before-migration-2026-11-01.sql` (193,231 bytes, SHA-256 `2c63617f90c948894dda98ead111630637192b77a38dd5d02f2f90ab23194c6a`). It is deliberately **not committed**.
- Source count metadata, 43 per-table MD5 digests, and ID comparison manifests are retained privately in `~/Documents/VeroTask/reconciliation/2026-11-01/`; no row contents or secrets are committed.

## Read-only row-count reconciliation

- Neon: **43 tables / 2,376 rows**.
- D1 staging: **43 application tables / 80 rows**.
- **24 tables have different row counts.** Matching counts on the other 19 tables do **not** establish that the records match.
- D1 has only 26 `categories`, 17 `businesses`, and 37 `business_categories` rows. All other 40 application tables are empty.

| Table | Neon rows | D1 rows | Delta (Neon − D1) |
|---|---:|---:|---:|
| `admin_audit_events` | 0 | 0 | 0 |
| `admin_credentials` | 1 | 0 | 1 |
| `admin_login_attempts` | 0 | 0 | 0 |
| `analytics_events` | 1537 | 0 | 1537 |
| `audit_exports` | 0 | 0 | 0 |
| `auth_tokens` | 54 | 0 | 54 |
| `bilateral_ratings` | 0 | 0 | 0 |
| `booking_checkout_sessions` | 20 | 0 | 20 |
| `booking_events` | 83 | 0 | 83 |
| `booking_evidence` | 0 | 0 | 0 |
| `booking_secrets` | 22 | 0 | 22 |
| `bookings` | 22 | 0 | 22 |
| `business_categories` | 73 | 37 | 36 |
| `business_claims` | 1 | 0 | 1 |
| `businesses` | 51 | 17 | 34 |
| `categories` | 26 | 26 | 0 |
| `conversations` | 0 | 0 | 0 |
| `crm_abandonments` | 1 | 0 | 1 |
| `crm_campaigns` | 30 | 0 | 30 |
| `crm_contacts` | 49 | 0 | 49 |
| `crm_email_events` | 2 | 0 | 2 |
| `crm_email_sends` | 47 | 0 | 47 |
| `customer_provider_relationships` | 0 | 0 | 0 |
| `customer_reputation` | 0 | 0 | 0 |
| `disputes` | 0 | 0 | 0 |
| `legal_cases` | 0 | 0 | 0 |
| `legal_holds` | 0 | 0 | 0 |
| `marketplace_searches` | 8 | 0 | 8 |
| `messages` | 0 | 0 | 0 |
| `platform_secrets` | 2 | 0 | 2 |
| `provider_availability` | 154 | 0 | 154 |
| `provider_checkout_sessions` | 0 | 0 | 0 |
| `provider_interaction_events` | 0 | 0 | 0 |
| `provider_profile_photos` | 9 | 0 | 9 |
| `provider_subscriptions` | 0 | 0 | 0 |
| `provider_transfers` | 0 | 0 | 0 |
| `refunds` | 0 | 0 | 0 |
| `reviews` | 0 | 0 | 0 |
| `services` | 22 | 0 | 22 |
| `sessions` | 52 | 0 | 52 |
| `transactional_email_outbox` | 12 | 0 | 12 |
| `users` | 49 | 0 | 49 |
| `visitor_sessions` | 49 | 0 | 49 |

## Identity collision: direct import is unsafe

- The 26 category slugs and English names are the same across databases, but **all 26 category UUIDs differ**.
- All 17 D1 business slugs exist in Neon, but **none of those 17 business UUIDs match**. The 17 D1 business IDs are absent from the Neon source.
- Consequently, an in-place naive INSERT conflicts with unique slugs; an UPSERT that preserves D1-generated UUIDs would break or require remapping source foreign keys. The 37 D1 business-category links are not proof of source fidelity.
- **Safe path:** use a fresh isolated D1 schema without seed rows and import the source with original primary keys, or build an explicit, tested slug-to-UUID mapping with referential-integrity checks. Never silently replace customer, provider, booking, subscription, refund, audit, or token identities.

## Application and production gates

- GitHub PR #5 was merged with successful CI. PR #6 remains open/draft, with green regression CI but an incomplete D1 port.
- The D1 compatibility audit still reports **23 TypeScript diagnostics in 7 transactional modules**: `bookings/[id]/accept`, `bookings/[id]/arrival-request`, `bookings/[id]/evidence`, `bookings/checkout`, `bookings/quote-request`, `stripe/webhook`, and `lib/dispute-workflow`. Strict gate fails; a regression-only green check is not a release approval.
- The 13 local SQLite schema/atomicity tests passed on 2026-11-01; the PostgreSQL application typecheck passed.
- The production HTTP smoke gate returned **GO** at `2026-11-01T11:45:56Z`: homepage, health, `/api/ready` (database, schema and storage), login redirects and unauthenticated webhook-monitor response were healthy. This is **not** a D1 cutover approval or proof that Stripe payment completion works.
- No Neon rows were imported into D1. No production database routing, real payments, subscription prices or webhooks were changed.

## Required before any cutover

1. Obtain an independent **encrypted logical export** of all 43 Neon tables and schema; preserve source records and create a restore drill. The Neon snapshot is a safety checkpoint, not a substitute.
2. Import into an isolated, unseeded D1 target (or explicitly remap seed UUIDs); reconcile every table by counts and per-row content, all PK/FK relationships, media object references, and Stripe session/payment/refund identities.
3. Complete the seven transactional modules with D1-native atomicity, concurrency and replay tests, then pass the strict compatibility gate.
4. Verify protected end-to-end signup, magic-link login, provider booking, signed Stripe test webhooks, cancellations, refunds, disputes, email outbox, R2 evidence, and rollback. Only after these gates can production routing or live payment behavior be considered.

To reproduce the metadata comparison once the two private JSON manifests exist:

```sh
node scripts/cloudflare/compare_table_counts.mjs <neon_counts.json> <d1_counts.json>
```

Exit code 2 means mismatches; exit code 0 means **counts only** match, never a production approval.
