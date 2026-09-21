import assert from "node:assert/strict";
import test from "node:test";
import { localePath, publicWorkflowPath } from "../src/lib/site-copy";

test("localePath adds exactly one public locale prefix", () => {
  assert.equal(localePath("en", "/services/cleaning/orlando-fl"), "/services/cleaning/orlando-fl");
  assert.equal(localePath("pt-br", "/services/cleaning/orlando-fl"), "/pt-br/services/cleaning/orlando-fl");
  assert.equal(localePath("es", "/locations/orlando-fl"), "/es/locations/orlando-fl");
});

test("public workflow URLs use real routes while preserving locale and query", () => {
  assert.equal(publicWorkflowPath("en", "/book/pro-123", { service: "service-1" }), "/book/pro-123?service=service-1");
  assert.equal(publicWorkflowPath("pt-br", "/book/pro-123", { q: "TV mounting", location: "32801" }), "/book/pro-123?locale=pt-br&q=TV+mounting&location=32801");
  assert.equal(publicWorkflowPath("es", "/book/pro-123"), "/book/pro-123?locale=es");
});
