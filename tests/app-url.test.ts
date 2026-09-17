import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { appUrlFromHeaders, canonicalAppUrl, requestAppUrl } from "../src/lib/app-url";

const env = process.env as Record<string, string | undefined>;
const ORIGINAL_ENV = {
  NODE_ENV: env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
  VERCEL_PROJECT_PRODUCTION_URL: env.VERCEL_PROJECT_PRODUCTION_URL,
  VERCEL_URL: env.VERCEL_URL
};

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
}

afterEach(restoreEnv);

test("production redirects stay pinned to the configured canonical origin", () => {
  env.NODE_ENV = "production";
  env.NEXT_PUBLIC_APP_URL = "https://app.verotask.example";
  env.VERCEL_PROJECT_PRODUCTION_URL = "vero-task-andres-projects-bbfd1881.vercel.app";

  assert.equal(canonicalAppUrl(), "https://app.verotask.example");
  assert.equal(requestAppUrl("https://attacker.example"), "https://app.verotask.example");

  const headers = new Headers({
    "x-forwarded-host": "attacker.example",
    "x-forwarded-proto": "https"
  });
  assert.equal(appUrlFromHeaders(headers), "https://app.verotask.example");
});

test("a retired production alias is ignored", () => {
  env.NODE_ENV = "production";
  env.NEXT_PUBLIC_APP_URL = "https://vero-task.vercel.app";
  env.VERCEL_PROJECT_PRODUCTION_URL = "vero-task-andres-projects-bbfd1881.vercel.app";

  assert.equal(canonicalAppUrl(), "https://vero-task-andres-projects-bbfd1881.vercel.app");
});

test("local development may use the request origin", () => {
  env.NODE_ENV = "development";
  env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

  assert.equal(requestAppUrl("http://127.0.0.1:3046"), "http://127.0.0.1:3046");
});
