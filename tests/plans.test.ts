import assert from "node:assert/strict";
import test from "node:test";
import { calculateBookingAmounts, PROVIDER_PLANS } from "../src/lib/plans";

test("provider plan pricing is fixed to the Orlando launch model", () => {
  assert.equal(PROVIDER_PLANS.free.monthlyPriceCents, 0);
  assert.equal(PROVIDER_PLANS.free.commissionBps, 1500);
  assert.equal(PROVIDER_PLANS.pro.monthlyPriceCents, 3900);
  assert.equal(PROVIDER_PLANS.pro.commissionBps, 1000);
  assert.equal(PROVIDER_PLANS.elite.monthlyPriceCents, 9900);
  assert.equal(PROVIDER_PLANS.elite.commissionBps, 700);
});

test("booking fee is separate from the service price paid directly to the provider", () => {
  const free = calculateBookingAmounts(20_000, "free");
  assert.equal(free.totalCents, 20_000);
  assert.equal(free.marketplaceFeeCents, 3_000);
  assert.equal(free.providerAmountCents, 20_000);

  const pro = calculateBookingAmounts(20_000, "pro");
  assert.equal(pro.marketplaceFeeCents, 2_000);
  assert.equal(pro.providerAmountCents, 20_000);

  const elite = calculateBookingAmounts(20_000, "elite");
  assert.equal(elite.marketplaceFeeCents, 1_400);
  assert.equal(elite.providerAmountCents, 20_000);
});

test("negative totals are rejected", () => {
  assert.throws(() => calculateBookingAmounts(-1, "free"));
});
