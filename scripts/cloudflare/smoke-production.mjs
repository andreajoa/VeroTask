#!/usr/bin/env node
// Read-only production smoke test: never signs in, books or pays.
// Usage: node scripts/cloudflare/smoke-production.mjs https://www.verotask.online
const base = (process.argv[2] || "https://www.verotask.online").replace(/\/$/, "");
const failures = [];

async function hit(path, expect) {
  const response = await fetch(base + path, { redirect: "manual", headers: { "user-agent": "verotask-smoke/1" } });
  const body = await response.text();
  const ok = expect(response.status, body);
  if (!ok) failures.push(`${response.status} ${path} ${body.slice(0, 160).replace(/\s+/g, " ")}`);
  return { status: response.status, body };
}

const json = (body) => { try { return JSON.parse(body); } catch { return {}; } };

await hit("/api/health", (s, b) => s === 200 && json(b).ok === true);
const ready = await hit("/api/ready", (s, b) => s === 200 && json(b).status === "ready");
console.log("ready:", JSON.stringify(json(ready.body).checks ?? {}));
await hit("/api/monitoring/stripe-webhook", (s) => s === 401);
await hit("/api/stripe/webhook", (s) => s === 405);
await hit("/dashboard", (s) => [302, 303, 307, 308].includes(s));
await hit("/admin", (s) => [302, 303, 307, 308].includes(s));
for (const path of ["/", "/services", "/providers", "/providers/join", "/signin", "/locations/orlando-fl", "/pt-br", "/es", "/terms", "/privacy", "/support"]) {
  await hit(path, (s) => s === 200);
}

// Every URL the sitemap advertises must render.
const sitemap = await hit("/sitemap.xml", (s) => s === 200);
const urls = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
console.log("sitemap urls:", urls.length);
const queue = [...new Set(urls)];
await Promise.all(Array.from({ length: 6 }, async () => {
  while (queue.length) { const path = queue.shift(); await hit(path, (s) => s === 200); }
}));

if (failures.length) {
  console.error(`FAIL ${failures.length}:\n` + failures.slice(0, 40).join("\n"));
  process.exit(1);
}
console.log(`PASS ${base}`);
