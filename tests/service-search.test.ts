import test from "node:test";
import assert from "node:assert/strict";
import { classifyServiceRequest, parseSearchLocation } from "../src/lib/service-search";

test("guided descriptions classify into existing service categories", () => {
  assert.ok(classifyServiceRequest("I need two TVs mounted").includes("tv-mounting"));
  assert.ok(classifyServiceRequest("Preciso de montagem de móveis").includes("furniture-assembly"));
  assert.ok(classifyServiceRequest("limpieza profunda de la casa").includes("deep-cleaning"));
  assert.deepEqual(classifyServiceRequest("unlisted specialty"), []);
});

test("Brazilian city, UF and CEP searches normalize the inputs shown in the wizard", () => {
  assert.deepEqual(parseSearchLocation("São Paulo, SP"), { city: "São Paulo", state: "SP", postalCode: "" });
  assert.deepEqual(parseSearchLocation("Santos SP"), { city: "Santos", state: "SP", postalCode: "" });
  assert.deepEqual(parseSearchLocation("01310-100"), { city: "", state: "", postalCode: "01310-100" });
  assert.deepEqual(parseSearchLocation("01310100"), { city: "", state: "", postalCode: "01310100" });
});
