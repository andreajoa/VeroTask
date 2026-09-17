import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { appUrlFromHeaders, canonicalAppUrl, requestAppUrl } from "../src/lib/app-url";

const ORIGINAL_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  VERCEL_URL: process.env.VERCEL_URL
};

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

afterEach(restoreEnv);

test("production redirects stay pinned to the configured canonical origin", () => {
  process.env.NODE_ENV = "production";
  process.env.NEXT_PUBLIC_APP_URL = "https://app.verotask.example";
  process.env.VERCEL_PROJECT_PRODUCTION_URL = "vero-task-andres-projects-bbfd1881.vercel.app";

  assert.equal(canonicalAppUrl(), "https://app.verotask.example");
  assert.equal(requestAppUrl("https://attacker.example"), "https://app.verotask.example");

  const headers = new Headers({
    "x-forwarded-host": "attacker.example",
    "x-forwarded-proto": "https"
  });
  assert.equal(appUrlFromHeaders(headers), "https://app.verotask.example");
});

test("a retired production alias is ignored", () => {
  process.env.NODE_ENV = "production";
  process.env.NEXT_PUBLIC_APP_URL = "https://vero-task.vercel.app";
  process.env.VERCEL_PROJECT_PRODUCTION_URL = "vero-task-andres-projects-bbfd1881.vercel.app";

  assert.equal(canonicalAppUrl(), "https://vero-task-andres-projects-bbfd1881.vercel.app");
});

test("local development may use the request origin", () => {
  process.env.NODE_ENV = "development";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

  assert.equal(requestAppUrl("http://127.0.0.1:3046"), "http://127.0.0.1:3046");
});
