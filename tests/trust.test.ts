import assert from "node:assert/strict";
import test from "node:test";
import { canAutoComplete, evidenceConfidence, proofOfServiceScore } from "../src/lib/trust";

test("verified provider arrival reaches high confidence", () => {
  const score = proofOfServiceScore({
    geoCheckIn: true,
    geoCheckOut: true,
    customerPin: true,
    checklistCompleted: true,
    providerCompletionTimestamp: true
  });
  assert.equal(score, 100);
  assert.equal(evidenceConfidence(score), "high");
  assert.equal(canAutoComplete(score, false), true);
});

test("direct customer arrival confirmation can replace the PIN fallback", () => {
  const score = proofOfServiceScore({
    geoCheckIn: true,
    customerArrivalConfirmation: true
  });
  assert.equal(score, 90);
  assert.equal(evidenceConfidence(score), "high");
  assert.equal(canAutoComplete(score, false), true);
});

test("a provider completion click alone cannot auto-complete a booking", () => {
  const score = proofOfServiceScore({ providerCompletionTimestamp: true });
  assert.equal(score, 2);
  assert.equal(evidenceConfidence(score), "low");
  assert.equal(canAutoComplete(score, false), false);
});

test("an open dispute always blocks auto-completion", () => {
  const score = proofOfServiceScore({ customerPin: true, geoCheckIn: true });
  assert.ok(score >= 85);
  assert.equal(canAutoComplete(score, true), false);
});
