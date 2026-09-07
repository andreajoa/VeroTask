import test from "node:test";
import assert from "node:assert/strict";
import { classifyServiceRequest, parseSearchLocation } from "../src/lib/service-search";

test("guided descriptions classify into existing service categories", () => {
  assert.ok(classifyServiceRequest("I need two TVs mounted").includes("tv-mounting"));
  assert.ok(classifyServiceRequest("Preciso de montagem de móveis").includes("furniture-assembly"));
  assert.ok(classifyServiceRequest("limpieza profunda de la casa").includes("deep-cleaning"));
  assert.deepEqual(classifyServiceRequest("unlisted specialty"), []);
});
test("city and ZIP search normalize the inputs shown in the wizard", () => {
  assert.deepEqual(parseSearchLocation("Orlando, FL"), { city: "Orlando", state: "FL", postalCode: "" });
  assert.deepEqual(parseSearchLocation("Winter Garden Florida"), { city: "Winter Garden", state: "FL", postalCode: "" });
  assert.deepEqual(parseSearchLocation("32801-1234"), { city: "", state: "", postalCode: "32801" });
});
