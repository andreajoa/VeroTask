import test from "node:test";
import assert from "node:assert/strict";
import { matchesUsdProviderPlanPrice } from "../src/lib/stripe-plan-price";

const pro = { active: true, currency: "usd", unit_amount: 3900, recurring: { interval: "month", interval_count: 1 }, type: "recurring" };
const elite = { ...pro, unit_amount: 9900 };

test("correct USD recurring prices are accepted for matching VeroTask plans", () => {
  assert.equal(matchesUsdProviderPlanPrice(pro, "pro"), true);
  assert.equal(matchesUsdProviderPlanPrice(elite, "elite"), true);
});

test("BRL catalog prices and mismatched monthly amounts are rejected", () => {
  assert.equal(matchesUsdProviderPlanPrice({ ...pro, currency: "brl" }, "pro"), false);
  assert.equal(matchesUsdProviderPlanPrice({ ...elite, currency: "brl" }, "elite"), false);
  assert.equal(matchesUsdProviderPlanPrice(elite, "pro"), false);
  assert.equal(matchesUsdProviderPlanPrice({ ...pro, unit_amount: 3999 }, "pro"), false);
});

test("expired, one-off, yearly and quarterly prices are rejected", () => {
  assert.equal(matchesUsdProviderPlanPrice({ ...pro, active: false }, "pro"), false);
  assert.equal(matchesUsdProviderPlanPrice({ ...pro, recurring: null }, "pro"), false);
  assert.equal(matchesUsdProviderPlanPrice({ ...pro, recurring: { interval: "year" } }, "pro"), false);
  assert.equal(matchesUsdProviderPlanPrice({ ...pro, recurring: { interval: "month", interval_count: 3 } }, "pro"), false);
  assert.equal(matchesUsdProviderPlanPrice({ ...pro, type: "one_time" }, "pro"), false);
});
