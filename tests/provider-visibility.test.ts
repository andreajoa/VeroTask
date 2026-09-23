import assert from "node:assert/strict";
import test from "node:test";
import { isProviderPubliclyVisible, isQaFixtureName } from "../src/lib/provider-visibility";

test("public discovery excludes inactive, suspended and paused providers", () => {
  assert.equal(isProviderPubliclyVisible({ active: true, status: "active" }), true);
  assert.equal(isProviderPubliclyVisible({ active: true, status: "pending" }), true);
  assert.equal(isProviderPubliclyVisible({ active: true, status: "suspended" }), false);
  assert.equal(isProviderPubliclyVisible({ active: true, status: "paused" }), false);
  assert.equal(isProviderPubliclyVisible({ active: false, status: "active" }), false);
});


test("QA production fixtures are recognized case-insensitively", () => {
  assert.equal(isQaFixtureName("VeroTask QA abc123"), true);
  assert.equal(isQaFixtureName("verotask qa abc123"), true);
  assert.equal(isQaFixtureName("VeroTask Quality Services"), false);
});
