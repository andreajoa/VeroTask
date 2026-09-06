import assert from "node:assert/strict";
import test from "node:test";
import { algorithmReputationScore, averageStars, reputationConfidence, reputationLabel } from "../src/lib/reputation-score";

test("new users display a five-star starting score", () => {
  assert.equal(averageStars([]), 5);
  assert.equal(reputationLabel(0, 0), "New");
  assert.equal(reputationConfidence(0, 0), 0);
});

test("real ratings replace the starting display score", () => {
  assert.equal(averageStars([5, 5, 4, 3]), 4.25);
  assert.equal(averageStars([1, 5]), 3);
});

test("reputation matures with verified rating and job history", () => {
  assert.equal(reputationLabel(3, 5), "Building history");
  assert.equal(reputationLabel(12, 15), "Established");
  assert.ok(reputationConfidence(15, 20) > reputationConfidence(2, 3));
});

test("a proven 4.9 ranks above an unproven new 5.0", () => {
  const newFive = algorithmReputationScore({ rating: 5, ratingCount: 0, completedJobs: 0 });
  const proven = algorithmReputationScore({ rating: 4.9, ratingCount: 80, completedJobs: 120 });
  assert.ok(proven > newFive);
});

test("algorithm score remains bounded", () => {
  assert.ok(algorithmReputationScore({ rating: 5, ratingCount: 100, completedJobs: 100 }) <= 100);
  assert.ok(algorithmReputationScore({ rating: 1, ratingCount: 0, completedJobs: 0 }) >= 0);
});
