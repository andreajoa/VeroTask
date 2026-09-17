#!/usr/bin/env node

const baseUrl = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const concurrency = Math.max(1, Math.min(Number(process.env.CONCURRENCY || 1000), 2000));
const requests = Math.max(concurrency, Number(process.env.REQUESTS || concurrency * 3));
const timeoutMs = Math.max(1000, Number(process.env.REQUEST_TIMEOUT_MS || 10000));
const paths = (process.env.LOAD_PATHS || "/api/health,/").split(",").map((v) => v.trim()).filter(Boolean);

const latencies = [];
let next = 0;
let ok = 0;
let failed = 0;
const statuses = new Map();
const networkErrors = new Map();
const responseSamples = new Map();
const byPath = new Map(paths.map((path) => [path, { ok: 0, failed: 0, latencies: [], statuses: new Map(), networkErrors: new Map() }]));

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
}

function increment(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function networkErrorKey(error) {
  if (!error || typeof error !== "object") return String(error || "unknown_error");
  const cause = error.cause && typeof error.cause === "object" ? error.cause : null;
  const code = cause?.code || error.code;
  const name = error.name || cause?.name || "Error";
  const message = String(cause?.message || error.message || "network failure")
    .replace(/https?:\/\/[^\s)]+/g, "<url>")
    .slice(0, 180);
  return [name, code, message].filter(Boolean).join(":");
}

function safeResponseHeaders(response) {
  const names = [
    "server",
    "x-vercel-id",
    "x-vercel-mitigated",
    "x-vercel-cache",
    "cf-ray",
    "retry-after",
    "content-type"
  ];
  return Object.fromEntries(names.map((name) => [name, response.headers.get(name)]).filter(([, value]) => value));
}

function summarizePath(path, data) {
  return {
    path,
    ok: data.ok,
    failed: data.failed,
    errorRate: Number(((data.failed / Math.max(1, data.ok + data.failed)) * 100).toFixed(3)),
    latencyMs: {
      p50: Math.round(percentile(data.latencies, 0.50)),
      p95: Math.round(percentile(data.latencies, 0.95)),
      p99: Math.round(percentile(data.latencies, 0.99)),
      max: Math.round(Math.max(...data.latencies, 0))
    },
    statuses: Object.fromEntries(data.statuses),
    networkErrors: Object.fromEntries(data.networkErrors)
  };
}

async function hit(index) {
  const path = paths[index % paths.length];
  const pathStats = byPath.get(path);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "VeroTask-load-verifier/2.1",
        "accept": "application/json,text/html;q=0.9,*/*;q=0.8"
      }
    });
    const elapsed = performance.now() - started;
    latencies.push(elapsed);
    pathStats.latencies.push(elapsed);
    increment(statuses, response.status);
    increment(pathStats.statuses, response.status);
    if (!response.ok && !responseSamples.has(response.status)) {
      responseSamples.set(response.status, { path, headers: safeResponseHeaders(response) });
    }
    if (response.ok) {
      ok += 1;
      pathStats.ok += 1;
    } else {
      failed += 1;
      pathStats.failed += 1;
    }
    await response.body?.cancel();
  } catch (error) {
    const elapsed = performance.now() - started;
    const key = networkErrorKey(error);
    failed += 1;
    pathStats.failed += 1;
    latencies.push(elapsed);
    pathStats.latencies.push(elapsed);
    increment(statuses, "network_error");
    increment(pathStats.statuses, "network_error");
    increment(networkErrors, key);
    increment(pathStats.networkErrors, key);
  } finally {
    clearTimeout(timer);
  }
}

async function worker() {
  while (true) {
    const index = next++;
    if (index >= requests) return;
    await hit(index);
  }
}

const startedAt = performance.now();
await Promise.all(Array.from({ length: Math.min(concurrency, requests) }, () => worker()));
const durationMs = performance.now() - startedAt;
const rps = requests / (durationMs / 1000);
const errorRate = failed / requests;

const result = {
  baseUrl,
  requests,
  concurrency,
  durationMs: Math.round(durationMs),
  requestsPerSecond: Number(rps.toFixed(2)),
  ok,
  failed,
  errorRate: Number((errorRate * 100).toFixed(3)),
  latencyMs: {
    p50: Math.round(percentile(latencies, 0.50)),
    p95: Math.round(percentile(latencies, 0.95)),
    p99: Math.round(percentile(latencies, 0.99)),
    max: Math.round(Math.max(...latencies, 0))
  },
  statuses: Object.fromEntries(statuses),
  networkErrors: Object.fromEntries(networkErrors),
  responseSamples: Object.fromEntries(responseSamples),
  paths: [...byPath.entries()].map(([path, data]) => summarizePath(path, data))
};

console.log(JSON.stringify(result, null, 2));
if (errorRate > Number(process.env.MAX_ERROR_RATE || 0.01)) process.exitCode = 1;
