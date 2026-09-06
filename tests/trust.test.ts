import assert from "node:assert/strict";
import test from "node:test";
import { canAutoComplete, evidenceConfidence, proofOfServiceScore } from "../src/lib/trust";

test("strong service evidence reaches high confidence", () => {
  const score = proofOfServiceScore({
    geoCheckIn: true,
    geoCheckOut: true,
    customerPin: true,
    beforePhotos: 1,
    afterPhotos: 1,
    checklistCompleted: true,
    providerCompletionTimestamp: true
  });
  assert.equal(score, 100);
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
  const score = proofOfServiceScore({ customerPin: true, geoCheckIn: true, checklistCompleted: true });
  assert.ok(score >= 55);
  assert.equal(canAutoComplete(score, true), false);
});
