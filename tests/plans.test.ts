import assert from "node:assert/strict";
import test from "node:test";
import { calculateBookingAmounts, PROVIDER_PLANS } from "../src/lib/plans";

test("provider plan pricing is fixed to the launch model", () => {
  assert.equal(PROVIDER_PLANS.free.monthlyPriceCents, 0);
  assert.equal(PROVIDER_PLANS.free.commissionBps, 1500);
  assert.equal(PROVIDER_PLANS.pro.monthlyPriceCents, 3900);
  assert.equal(PROVIDER_PLANS.pro.commissionBps, 1000);
  assert.equal(PROVIDER_PLANS.elite.monthlyPriceCents, 9900);
  assert.equal(PROVIDER_PLANS.elite.commissionBps, 700);
});

test("booking amounts preserve the customer total", () => {
  const free = calculateBookingAmounts(20_000, "free");
  assert.equal(free.marketplaceFeeCents, 3_000);
  assert.equal(free.providerAmountCents, 17_000);
  assert.equal(free.marketplaceFeeCents + free.providerAmountCents, free.totalCents);

  const pro = calculateBookingAmounts(20_000, "pro");
  assert.equal(pro.marketplaceFeeCents, 2_000);
  assert.equal(pro.providerAmountCents, 18_000);

  const elite = calculateBookingAmounts(20_000, "elite");
  assert.equal(elite.marketplaceFeeCents, 1_400);
  assert.equal(elite.providerAmountCents, 18_600);
});

test("negative totals are rejected", () => {
  assert.throws(() => calculateBookingAmounts(-1, "free"));
});
