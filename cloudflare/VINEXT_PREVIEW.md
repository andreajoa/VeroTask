# Cloudflare native D1 preview (not a production release)

The current **separate** Worker preview lives at:

https://verotask-vinext-preview.andrealmeidashop.workers.dev

Validated after deployment: `/`, `/services`, `/providers`, and a `providers/:slug` page return HTTP 200; startup time is under 50 ms. Its Worker has a native Cloudflare D1 `DB` binding to `verotask-migration-staging` and does **not** need a Neon connection to read the public catalog. The 17 source-seeded `unclaimed` providers/26 categories/37 category links were populated on this staging database in PR #18.

Build/deploy on the account authenticated with Wrangler:

```
npm ci
npm run build:vinext
npx wrangler deploy --config wrangler.vinext-preview.json
```

Use the `wrangler` configuration above rather than `--no-bundle`. The generated vinext bundle imports multiple JS chunks, and deploying with `--no-bundle` fails because its module imports aren't collected. The current `vinext-cloudflare deploy` CLI requires **separate** `cf` OAuth authorization even if Wrangler is already logged in. The Wrangler bundled route was tested successfully without changing DNS.

This preview is **NOT READY FOR CUSTOMER REGISTRATION OR CHARGES**: it has no verified Resend live secret, D1 real auth and transactional write gates are disabled, Stripe webhooks haven't passed end-to-end on the actual VeroTask account, the D1 catalog is not an export of any later manually entered Neon profiles, and runtime integration tests are not exhaustive. The public VeroTask domain still uses the original Vercel/Neon deployment. Do not switch the live domain or enable payment write flags until these gates pass. The Next.js dependency in this preview was updated to 16.4.2, resolving the previously detected critical advisory, but `npm audit` still has high and moderate findings that need review before a commercial rollout.

## Native D1 authentication code (disabled in public preview)

The Cloudflare vinext bundle aliases `@/lib/d1-auth` to `src/lib/d1-auth-worker.ts`, which calls the same validated single-use token/session SQL directly through the native D1 binding rather than the staging HTTP proxy. **Activation intentionally requires `AUTH_STORE=d1`** in the Cloudflare Worker environment together with verified transactional mail delivery. That setting is not enabled in the public preview; the signup is therefore not a released client feature. Do not enable the public login while `RESEND_API_KEY` and `NEXT_PUBLIC_APP_URL` are missing and end-to-end link consumption remains untested.

## Direct Cloudflare R2 evidence storage (October 22, 2026)

The preview now binds the existing `verotask-booking-evidence` R2 bucket as `R2`, with no S3 API key stored in the deployment. The `@/lib/storage` Worker alias uses `src/lib/storage-worker.ts` for protected direct object operations, readiness verification and scoped 5-minute upload/download capabilities. The browser uploads via the private `/api/private-evidence-object` endpoint only with a valid HMAC capability, the exact byte count and supported image magic; object overwrite is rejected. The original presigning route still checks provider booking ownership and evidence workflow status first. A live R2 readiness probe performed put, head and delete and returned `storageOperational=true`. A request without a signed capability returned HTTP 401. **Signed upload and download need a freshly provisioned `UPLOAD_SIGNING_SECRET` Worker secret (32+ chars); this has NOT been configured or validated end-to-end.** Do not expose that secret in Git, URLs, logs or frontend code. The production site and payment gates remain unchanged; `/api/ready` still returns 503 because required secrets, URL and payment/email checks remain.
