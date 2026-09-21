import assert from "node:assert/strict";
import test from "node:test";
import { matchesPublishedAvailability } from "../src/lib/availability";

const mondayHours = [{ dayOfWeek: 1, startTime: "08:00:00", endTime: "18:00:00", active: true }];

test("published availability accepts only same-day slots inside provider hours", () => {
  assert.equal(matchesPublishedAvailability(
    new Date("2026-09-21T13:00:00.000Z"),
    new Date("2026-09-21T15:00:00.000Z"),
    mondayHours
  ), true);
  assert.equal(matchesPublishedAvailability(
    new Date("2026-09-21T10:00:00.000Z"),
    new Date("2026-09-21T12:00:00.000Z"),
    mondayHours
  ), false);
  assert.equal(matchesPublishedAvailability(
    new Date("2026-09-22T13:00:00.000Z"),
    new Date("2026-09-22T15:00:00.000Z"),
    mondayHours
  ), false);
  assert.equal(matchesPublishedAvailability(
    new Date("2026-09-21T23:00:00.000Z"),
    new Date("2026-09-22T01:00:00.000Z"),
    mondayHours
  ), false);
});

test("providers without published hours remain available for same-day requests", () => {
  assert.equal(matchesPublishedAvailability(
    new Date("2026-09-21T13:00:00.000Z"),
    new Date("2026-09-21T15:00:00.000Z"),
    []
  ), true);
});

test("a provider who closes every published day is unavailable", () => {
  assert.equal(matchesPublishedAvailability(
    new Date("2026-09-21T13:00:00.000Z"),
    new Date("2026-09-21T15:00:00.000Z"),
    mondayHours.map((rule) => ({ ...rule, active: false }))
  ), false);
});
