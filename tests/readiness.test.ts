import assert from "node:assert/strict";
import test from "node:test";
import { readinessPassed, type ReadinessChecks } from "../src/lib/readiness";

test("readiness fails when any launch dependency is unavailable", () => {
  const healthy: ReadinessChecks = { database: true, schema: true, storageOperational: true, configuredAppUrlValid: true, requiredEnvironmentConfigured: true };
  assert.equal(readinessPassed(healthy), true);
  for (const key of Object.keys(healthy)) {
    assert.equal(readinessPassed({ ...healthy, [key]: false }), false, key);
  }
});
