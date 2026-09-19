import assert from "node:assert/strict";
import test from "node:test";
import { clearSessionCookieOptions, SESSION_DAYS, sessionCookieOptions } from "../src/lib/auth-session-cookie";

test("production session cookie persists across VeroTask apex and www hosts", () => {
  const expiresAt = new Date("2026-10-18T12:00:00.000Z");
  const options = sessionCookieOptions(expiresAt, true);
  assert.equal(options.domain, ".verotask.online");
  assert.equal(options.path, "/");
  assert.equal(options.secure, true);
  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, "lax");
  assert.equal(options.maxAge, SESSION_DAYS * 24 * 60 * 60);
  assert.equal(options.expires, expiresAt);
});

test("local session cookie stays host-only", () => {
  const options = sessionCookieOptions(new Date("2026-10-18T12:00:00.000Z"), false);
  assert.equal("domain" in options, false);
  assert.equal(options.secure, false);
});

test("sign-out clears the same production cookie scope", () => {
  const options = clearSessionCookieOptions(true);
  assert.equal(options.domain, ".verotask.online");
  assert.equal(options.path, "/");
  assert.equal(options.maxAge, 0);
  assert.equal(options.expires.getTime(), 0);
});
