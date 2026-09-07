# Public provider privacy

Public service listings and provider profiles use a VeroTask identifier and UUID-based URLs. Legal/business names, telephone numbers, email addresses and external websites remain in private records. Category, service region, ratings, verification status and booking actions remain available.

The same presentation applies to localized listings, local-service structured data, sitemap entries, ownership-claim headings and the booking-entry screen. Legacy named profile URLs redirect to the opaque profile URL. Provider-authored service copy strips the registered business name and common contact patterns as defense in depth; this is not a guarantee against deliberately obfuscated text.

Verification:

- `node --import tsx --test tests/public-provider.test.ts`: two regression tests passed.
- `node --env-file=.env.local scripts/verify-public-privacy.mjs`: twelve checks passed against eighteen local profiles, including raw HTML in three languages, legacy redirects, profile navigation and mobile width. Screenshots and report are written under ignored `.local/public-privacy/`.
- Production build passed.
- Typecheck passed; lint has no errors and three existing unused-variable warnings in `booking-workflow.ts`.
- Full existing suite: 24/25 passed. The existing search-location test expects Florida/US ZIP normalization, while the current parser uses the newer Brazil behavior. That unrelated behavior was preserved in this privacy correction.

This change does not alter payment amounts, payout models, private booking permissions or authentication behavior.
