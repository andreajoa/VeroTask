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

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
}

async function hit(index) {
  const path = paths[index % paths.length];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "VeroTask-load-verifier/1.0" }
    });
    const elapsed = performance.now() - started;
    latencies.push(elapsed);
    statuses.set(response.status, (statuses.get(response.status) || 0) + 1);
    if (response.ok) ok += 1; else failed += 1;
    await response.body?.cancel();
  } catch {
    failed += 1;
    latencies.push(performance.now() - started);
    statuses.set("network_error", (statuses.get("network_error") || 0) + 1);
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
  statuses: Object.fromEntries(statuses)
};

console.log(JSON.stringify(result, null, 2));
if (errorRate > Number(process.env.MAX_ERROR_RATE || 0.01)) process.exitCode = 1;
