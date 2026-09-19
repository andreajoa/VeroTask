import assert from "node:assert/strict";
import test from "node:test";

process.env.UNSUBSCRIBE_SECRET = "verotask-test-secret-with-at-least-24-characters";

import { emailTrackingToken, verifyEmailTrackingToken } from "../src/lib/crm-email";
import { EMAIL_TEMPLATES } from "../src/lib/crm-templates";

test("marketing library contains exactly 30 campaigns", () => {
  assert.equal(EMAIL_TEMPLATES.filter((template) => template.kind === "marketing").length, 30);
});

test("email tracking tokens verify and reject tampering", () => {
  const token = emailTrackingToken({
    sendId: "11111111-1111-4111-8111-111111111111",
    kind: "click",
    target: "https://www.verotask.online/services"
  });
  const parsed = verifyEmailTrackingToken(token);
  assert.equal(parsed?.kind, "click");
  assert.equal(parsed?.sendId, "11111111-1111-4111-8111-111111111111");
  assert.equal(parsed?.target, "https://www.verotask.online/services");

  const tampered = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");
  assert.equal(verifyEmailTrackingToken(tampered), null);
});
