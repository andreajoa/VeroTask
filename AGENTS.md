<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# VeroTask — engineering contract

`README.md` explains the product. This file explains the things that are **not visible from reading the code casually** and that have already caused wrong conclusions. Read it before changing anything.

VeroTask is a local-services marketplace for Orlando / Central Florida. Real money, real customers, live Stripe. A wrong assumption here charges someone's card and delivers nothing.

---

## 1. The money model

VeroTask **never handles the service price.** It charges the customer a *booking fee* only, and that is the entire revenue from a booking.

```
customer pays VeroTask ....... marketplaceFeeCents   (Stripe Checkout)
customer pays the provider ... the whole service price, directly, off-platform
VeroTask pays the provider ... nothing, ever
```

- There is **no Stripe Connect**, no transfers, no payouts. `src/lib/payment-policy.ts` still exports `canReleasePayment`, labelled as a legacy helper — do not build on it as if payouts existed.
- `calculateBookingAmounts` (`src/lib/plans.ts`) returns `providerAmountCents === totalCents` on purpose. That is not a bug.
- Fee percentage depends on the provider's plan: Free 15% (1500 bps), Pro 10% (1000 bps), Elite 7% (700 bps). Plan subscriptions are separate Stripe Billing charges to the provider.

**Invariant:** the booking fee is the only amount VeroTask may ever charge or refund on a booking. `validateBookingPayment` rejects a payment whose `amount_received` is not exactly `marketplaceFeeCents`.

---

## 2. Status vocabulary — read this table before touching booking state

`booking_status` has 12 values (`src/db/schema.ts`). Two names mislead:

| status | what it actually means | set by |
|---|---|---|
| `requested` | quote requested, nothing charged | quote-request |
| `accepted` | provider sent a price | accept route |
| **`payment_authorized`** | **checkout page was OPENED. Nothing was paid.** | payment-session route |
| **`scheduled`** | **the booking fee was actually paid and confirmed** | `markBookingPaid` only |
| `in_progress` | provider checked in with PIN + geofence | check-in |
| `provider_completed` | provider marked done; protection window running | complete |
| `customer_confirmed` / `auto_completed` | finished | confirm / settle cron |
| `disputed`, `cancelled`, `refunded`, `paid_out` | terminal / exceptional | various |

> **`payment_authorized` does NOT mean paid.** The UI itself labels it *"booking fee checkout started"* (`src/components/booking-workflow-panel.tsx`). A booking sitting in `payment_authorized` with `stripePaymentIntentId = null` was never paid. This has already been misread as a successful payment.

**The status that means "money arrived" is `scheduled`, and nothing else.**

---

## 3. The single hinge: the Stripe webhook

Everything the customer and provider get after paying is gated on one status transition, and that transition happens in exactly one place in the entire codebase:

```
Stripe → POST /api/stripe/webhook
           └─ markBookingPaid()        ← the ONLY caller is that webhook
                └─ status := "scheduled"
```

What `scheduled` unlocks:

- **Exact service address** released to the provider — `ADDRESS_RELEASE_STATUSES` in `src/app/bookings/[id]/page.tsx`. Before it, the provider sees only a masked area (city/ZIP).
- **Real business name** shown instead of the anonymised public alias.
- **The 6-digit service PIN** shown to the customer — `pin` is computed only when status is `scheduled` or `in_progress`.
- Thank-you email, scheduling, and the whole check-in path.

**Consequence to keep in mind:** if the webhook does not deliver, Stripe still charges the customer's card. The booking stays in `payment_authorized` forever, the provider never sees the address or time, and **the customer never receives the PIN**. Money taken, nothing delivered, and nothing in the app looks broken.

**Never** add a second writer of `scheduled`, and never set it from a client-side success redirect. A Checkout success URL proves the browser came back, not that the payment settled.

### How to tell whether the webhook is alive without making a payment

A checkout session that is past `expires_at` and still `status = 'open'` means Stripe is not reaching this deployment — Stripe fires `checkout.session.expired` and the handler marks it `expired`. Note that the cancellation path also writes `expired`, so attribute carefully: compare `updated_at` against the `booking_cancelled` event. That direction of error is safe for the alarm below: a local write can only hide a dead webhook, never invent one, because every row it counts is still `open`.

This is automated. `GET /api/monitoring/stripe-webhook` (`src/lib/stripe-webhook-liveness.ts`) returns 200 while events are arriving and **503** when a session lapsed more than an hour ago and is still open; the hourly `Stripe Webhook Liveness` workflow turns red on 503. Two deliberate choices there: a 60-minute grace, because Stripe's expiry event is not instant, and a 48-hour window, because Stripe never re-emits the expiry of an old session — without the window the alarm would stay red forever after the endpoint is fixed. `payment_succeeded`, `payment_requires_refund` and `checkout_expired` are written by the webhook and nothing else, so `lastInboundEventAt` is the honest answer to "when did Stripe last reach us".

Required webhook events (`src/app/api/stripe/webhook/route.ts`):

```
checkout.session.completed
checkout.session.async_payment_succeeded
checkout.session.expired
payment_intent.succeeded
refund.updated
charge.dispute.created
customer.subscription.created | updated | deleted
```

---

## 4. The PIN and check-in

- The PIN is **derived, not stored**: `HMAC-SHA256(secret, "service-pin:" + bookingId)` → 6 digits (`src/lib/booking.ts`). Only its hash lives in `booking_secrets`.
- Check-in requires **both** the correct PIN *and* a GPS position inside a geofence sized from the reported accuracy (`src/app/api/bookings/[id]/check-in/route.ts`). It records `geo_check_in` evidence.
- After 10 wrong PIN attempts the PIN locks and the flow falls back to explicit customer confirmation. Do not "fix" this by raising the limit; it is an anti-brute-force control on a code the customer holds.

---

## 5. Data that looks like junk but is load-bearing

**Unclaimed businesses are the supply side, not dead rows.** A customer can request a quote from a business that never signed up. VeroTask emails that business, it claims the profile through an email link (`/api/claims/verify-opportunity-email`, `/api/providers/[businessId]/claim-opportunity`, event `provider_profile_claimed_from_opportunity`), then sets its price. This is how the marketplace solves its cold start.

Never "clean up" `businesses` with `status = 'unclaimed'`. Deleting them deletes the inventory.

---

## 6. Database access — two drivers, not interchangeable

`src/db/index.ts` exposes two accessors over the same `DATABASE_URL`:

- `getDb()` — Neon **HTTP** driver in production. Fine for ordinary reads and single statements. **It cannot hold row locks or run interactive transactions.**
- `getTransactionalDb()` — node-postgres **Pool**, always. Use it whenever you need a real transaction, `SELECT … FOR UPDATE`, or multi-statement atomicity. `markBookingPaid` and the dispute/refund paths use it for exactly that reason.

**The dangerous part:** when `DATABASE_DRIVER=postgres` (common in local dev), `getDb()` *is* node-postgres and transactions appear to work. In production it is Neon HTTP and they do not. A transaction written against `getDb()` can pass every local test and silently lose its isolation in production, under concurrency, on the money path. If it must be atomic, use `getTransactionalDb()` — no exceptions.

---

## 7. Refund and dispute invariants

- **Stripe idempotency keys replay the first response forever.** A retry under the same key will return the original failed refund, not a new attempt. Retries must use a *new* key — see `src/lib/dispute-workflow.ts`.
- A failed refund and its replacement **must be able to coexist on the same dispute**. Do not add a unique index on `refunds.dispute_id`; it would block legitimate retries.
- Total refunds on a booking can never exceed `marketplaceFeeCents`. A second dispute is limited to the unrefunded remainder, and that limit is validated *before* calling Stripe so the admin gets a clear error instead of an opaque gateway failure.
- Webhook handlers are individually idempotent (`onConflictDoNothing`, conditional updates, resolved-at guards). There is deliberately **no** global Stripe event-id dedup table; do not assume one exists.

---

## 8. Next.js 16 specifics in this repo

- Middleware lives at **`src/proxy.ts`**, not `middleware.ts`.
- Routes that must never be cached declare `export const dynamic = "force-dynamic"` — `/api/ready` and the booking pages rely on it.
- Background work after a response uses `after()`. Anything scheduled there can be killed when the invocation ends, so it must be a *best-effort accelerator* on top of durable state, never the only mechanism. The transactional email outbox follows this rule: the row is persisted with `nextAttemptAt` first, and `after()` only tries to send sooner.
- Always check `node_modules/next/dist/docs/` before using an API from memory.

---

## 9. Email durability

Transactional email goes through `transactional_email_outbox` with claim/stale-claim semantics, plus a GitHub Actions recovery workflow (`.github/workflows/email-recovery.yml`) that drains it every 5 minutes via `/api/cron/email-outbox`. If you add a user-visible email, queue it in the outbox — do not `await` a provider call inside a request handler as the only delivery attempt.

---

## 10. Tests: what they cover and, more importantly, what they do not

| suite | covers | does **not** cover |
|---|---|---|
| `npm test` (62 unit/policy) | pure logic, policies, validation | anything involving the network |
| `scripts/verify-launch-journey.mjs` (31 checks) | full local browser journey, EN/PT/ES, mobile | payment, Stripe, production |
| `scripts/verify-payment-recovery.ts` (6 scenarios) | refunds/disputes/webhook replay against isolated Postgres | live Stripe |
| Production Journey E2E (15 checks) | the real site, real emails, creates a **live** `cs_live_` Checkout Session | **stops deliberately before paying** |

**No automated test has ever completed a payment.** The post-payment half of the product — webhook delivery, `scheduled`, address release, PIN issuance, provider notification — is only verifiable with a real card. Treat "the journey passed" as proof that checkout *opens*, not that payment *works*.

Two traps when writing browser tests:

1. **Wait for hydration before interacting.** Server HTML answers clicks with nothing until React attaches handlers; an early click is silently swallowed and looks exactly like a broken feature. Gate on `Object.keys(document.body).some(k => k.startsWith('__react'))`.
2. **Assert on the API response, not the button label.** Labels flip to "Sending…" immediately, so waiting for the original label to disappear passes while the request is still in flight.

Also: the lead popup (`src/components/interest-popup.tsx`) opens 28 s after any public page load and covers the viewport. Browser tests must seed `localStorage.verotask_interest_popup_dismissed_v1`.

**The production E2E runs against the live database.** Anything it creates is real production data.

---

## 11. Verifying a deployment

The Vercel API and CLI return **403** for this project, and the app exposes no commit SHA. To prove which code is live, pick an observable change from the commit and probe the public URL — the readiness contract shape has worked well for this (`/api/ready`). Compare against `git show <sha>:<file>`.

`Production Smoke` is triggered by the same push that starts the deploy, so it can fail simply for running before the new build is live. Re-run it before treating a failure as real.

`GET /api/ready` performs a genuine R2 `Put → Head → Delete` round trip and a schema presence check; it is not an env-var check.

---

## 12. What is proven and what is not (as of 2026-09-22)

Measured through `/api/monitoring/stripe-webhook` against the production database:

```
lastInboundEventType: "payment_succeeded"   at 2026-09-22T00:45:58Z
confirmedPayments:    1
lapsedOpenSessions:   []
```

**The booking-fee path works end to end, with real money.** A real card paid a real booking fee on production. `markBookingPaid` ran, the booking reached `scheduled`, the exact address was released to the provider, and the six-digit PIN was issued to the customer, who read it off the page. Both halves are proven: Stripe reaches this deployment, *and* everything gated behind the payment executes. The failure mode described in §3 — card charged, nothing delivered, nothing looking broken — did not occur.

The test was deliberately the cheapest one the code permits rather than a special case: `payment-session` rejects a fee under 50c (`:30`) and a quote under $10.00 (`:52`), so a $10.00 quote at the Free plan's 15% yields a $1.50 fee. Nothing on the money path was modified to make it fit.

**Still never exercised with real money.** Do not let the paragraph above be read as covering these:

- **Refunds and disputes.** `refund.updated` has never fired in production.
- **Provider plan subscriptions.** A *different* flow (`api/stripe/subscriptions/checkout`, `mode: "subscription"`) with a *different* set of webhook events (`customer.subscription.*`). No provider has ever been charged, and no renewal has ever occurred. This is the path a recruited provider hits first, so proving the booking fee says nothing about it.
- **Check-in.** Needs the PIN plus a GPS fix inside the geofence, so it cannot be proven remotely.

### The mistake this section replaces

The previous version of this section claimed no Stripe event had ever reached production. That was measured against the database in `.env.local`, **which is not the production database** — it is a dev copy holding the same older rows, so every query looked plausible. The proof: a marked event posted to `POST https://www.verotask.online/api/analytics/collect` returned 200 and never appeared in that database, and a credential written into its `platform_secrets` came back as `credentialProvisioned: false` from production.

**Before reporting anything about production data, prove which database you are reading.** The marked-analytics-event test above takes thirty seconds. Production's connection string lives only in Vercel, which returns 403 (§11), so the supported way to read production state is an endpoint authorised by a hashed credential in `platform_secrets` — that is what the monitor does.

---

## 13. Rules for changes

1. Do not claim something works because the build, types or tests are green. Measure the behaviour where it runs — and prove *where* you measured it (§12) before reporting it as production.
2. Do not widen the money path (amounts, refunds, statuses) without a test in `scripts/verify-payment-recovery.ts`.
3. Do not add a second writer for any status the webhook owns.
4. Keep the exact service address, real business name and PIN gated behind `scheduled`.
5. Comment *why*, not *what* — especially where a guard looks removable.
6. Run the full gate before publishing: `npm run typecheck && npm run lint && npm test && npm run build`.
