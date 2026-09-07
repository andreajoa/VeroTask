import { setTimeout as delay } from "node:timers/promises";

const base = new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3046");
if (!["localhost", "127.0.0.1", "[::1]"].includes(base.hostname) || !process.env.CRON_SECRET) throw new Error("Local URL and CRON_SECRET are required");
let stopping = false;
const controller = new AbortController();
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { stopping = true; controller.abort(); });
while (!stopping) {
  try {
    const response = await fetch(new URL("/api/cron/settle-bookings", base), {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(55_000)])
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    console.log(`${new Date().toISOString()} Scheduled tasks completed`);
  } catch (error) {
    if (!stopping) console.error(`${new Date().toISOString()} Scheduled tasks pending: ${error.message}`);
  }
  if (!stopping) await delay(60_000, undefined, { signal: controller.signal }).catch(() => {});
}
