import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET } from "../src/app/api/monitoring/stripe-webhook/route";

const url = "https://www.verotask.online/api/monitoring/stripe-webhook";

test("missing cron authorization always returns HTTP 401 without a database read", async () => {
  const response = await GET(new NextRequest(url));
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});

test("blank bearer token is rejected independently of database availability", async () => {
  const response = await GET(new NextRequest(url, { headers: { authorization: "Bearer " } }));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});

test("incorrect short bearer token is rejected without querying Neon", async () => {
  const response = await GET(new NextRequest(url, { headers: { authorization: "Bearer invalid" } }));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});
