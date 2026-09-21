import assert from "node:assert/strict";
import test from "node:test";
import { isProviderPubliclyVisible } from "../src/lib/provider-visibility";

test("public discovery excludes inactive, suspended and paused providers", () => {
  assert.equal(isProviderPubliclyVisible({ active: true, status: "active" }), true);
  assert.equal(isProviderPubliclyVisible({ active: true, status: "pending" }), true);
  assert.equal(isProviderPubliclyVisible({ active: true, status: "suspended" }), false);
  assert.equal(isProviderPubliclyVisible({ active: true, status: "paused" }), false);
  assert.equal(isProviderPubliclyVisible({ active: false, status: "active" }), false);
});
