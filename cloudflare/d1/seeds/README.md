# Original public unclaimed provider catalog

This is a **source-code recovery**, not a backup from the blocked Neon production database.

`0001_public_unclaimed_from_original_source.sql` is generated from the checked-in `src/db/seed.ts` by `node scripts/cloudflare/generate_unclaimed_seed.mjs`. It restores **17 originally seeded `unclaimed` public businesses**, **26 categories**, and **37 business-category links**, including originally supplied phone/website/address fields. `INSERT OR IGNORE` ensures rerunning it never overwrites claimed or user-edited business profiles. Verify generated output against the source seed after catalog changes.

Import into the *staging* Cloudflare D1 only:

```sh
wrangler d1 execute verotask-migration-staging --remote --file cloudflare/d1/seeds/0001_public_unclaimed_from_original_source.sql --yes
```

Verification, without exposing customer records:

```sql
SELECT (SELECT count(*) FROM businesses WHERE status='unclaimed') AS unclaimed,
       (SELECT count(*) FROM categories) AS categories,
       (SELECT count(*) FROM business_categories) AS category_links;
```

**Critical limitation:** More profiles may have been added manually in Neon after the source seed was run. Those are **not** represented here, and are still recoverable only by exporting the historical database or locating another verified data export. Never assert that this is a complete production migration. No customer, booking, payment, consent or historical claim is recreated by this seed. The original Neon branch must be preserved until historical reconciliation is resolved.
