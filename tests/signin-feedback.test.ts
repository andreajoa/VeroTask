import test from "node:test";
import assert from "node:assert/strict";
import { classifyMagicLinkCreationError, signInErrorMessage } from "../src/lib/signin-feedback";

test("Neon quota failures are classified as account service failures, not email failures", () => {
  const neon = new Error('Failed query: select count(*) from auth_tokens');
  Object.assign(neon, { cause: new Error('NeonDbError: HTTP status 402: quota exceeded') });
  assert.equal(classifyMagicLinkCreationError(neon), 'auth-unavailable');
  assert.match(signInErrorMessage('auth-unavailable')!, /No sign-in email was sent/);
  assert.doesNotMatch(signInErrorMessage('auth-unavailable')!, /Email delivery is temporarily unavailable/);
});

test("rate limits remain distinct from database downtime", () => {
  assert.equal(classifyMagicLinkCreationError(new Error('auth_rate_limited')), 'rate-limited');
  assert.match(signInErrorMessage('rate-limited')!, /Too many sign-in links/);
});

test("actual email-send failure receives a separate accurate message", () => {
  assert.match(signInErrorMessage('email-unavailable')!, /could not send the email/);
  assert.equal(signInErrorMessage(undefined), null);
});
