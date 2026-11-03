import assert from "node:assert/strict";
import { test } from "node:test";
import { deliverEmail } from "../src/lib/email-delivery";

for (const [name, message, reason] of [
  ...["invalid_api_key", "daily_quota_exceeded", "validation_error", "recipient-secret@example.com"].map(name => [name, "recipient-secret@example.com token=private re_test_secret", "unspecified"]),
  ["validation_error", "The private.example domain is not verified. Please add and verify your domain.", "domain_not_verified"],
  ["validation_error", "You can only send testing emails to your own email address (recipient-secret@example.com).", "testing_restriction"]
]) {
  test(`delivery logs safe diagnostics for ${name}`, async (t) => {
    const original = { ...process.env };
    t.after(() => { process.env = original; });
    (process.env as Record<string, string>).NODE_ENV = "production";
    process.env.LOCAL_EMAIL = "false";
    process.env.RESEND_API_KEY = "re_test_secret";
    process.env.EMAIL_FROM = "VeroTask <test@example.com>";
    const logs: unknown[][] = [];
    t.mock.method(console, "error", (...args: unknown[]) => logs.push(args));
    t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({
      name, statusCode: 403, message
    }), { status: 403, headers: { "content-type": "application/json" } }));
    await assert.rejects(deliverEmail({ to: "recipient-secret@example.com", subject: "Login", html: "token=private" }));
    assert.equal(logs.length, 1);
    assert.deepEqual(logs[0], ["[VeroTask email] delivery failed", {
      provider: "resend", code: name.includes("@") ? "unknown_provider_error" : name, statusCode: 403, reason
    }]);
    assert.doesNotMatch(JSON.stringify(logs), /recipient-secret|token=private|re_test_secret/);
  });
}

test("successful delivery returns its identifier without logging an error", async (t) => {
  const original = { ...process.env };
  t.after(() => { process.env = original; });
  (process.env as Record<string, string>).NODE_ENV = "production";
  process.env.LOCAL_EMAIL = "false";
  process.env.RESEND_API_KEY = "re_test_secret";
  process.env.EMAIL_FROM = "VeroTask <test@example.com>";
  const log = t.mock.method(console, "error", () => {});
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ id: "email-id" }), { status: 200 }));
  assert.deepEqual(await deliverEmail({ to: "test@example.com", subject: "Test", html: "Test" }), { id: "email-id", local: false });
  assert.equal(log.mock.callCount(), 0);
});
