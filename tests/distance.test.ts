import assert from "node:assert/strict";
import test from "node:test";
import { distanceMiles, isWithinServiceRadius } from "../src/lib/distance";

test("distanceMiles calculates a realistic great-circle distance", () => {
  const miles = distanceMiles(
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 1 }
  );
  assert.ok(miles > 69 && miles < 70);
});

test("service radius accepts nearby work and rejects distant work", () => {
  const provider = { latitude: 28.5383, longitude: -81.3792 };
  const nearby = { latitude: 28.5483, longitude: -81.3792 };
  const far = { latitude: 29.0383, longitude: -81.3792 };

  assert.equal(isWithinServiceRadius(provider, nearby, 5), true);
  assert.equal(isWithinServiceRadius(provider, far, 15), false);
});
