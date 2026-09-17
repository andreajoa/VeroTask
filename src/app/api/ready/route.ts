import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// This endpoint is intentionally strict: HTTP 200 means the deployment has the
// configuration required for the complete production experience, not only that
// the Next.js process is alive.
const REQUIRED_ENV = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_PRO_MONTHLY",
  "STRIPE_PRICE_ELITE_MONTHLY",
  "CRON_SECRET",
  "RESEND_API_KEY",
  "RESEND_WEBHOOK_SECRET",
  "EMAIL_FROM",
  "MARKETING_POSTAL_ADDRESS",
  "STORAGE_ENDPOINT",
  "STORAGE_BUCKET",
  "STORAGE_ACCESS_KEY_ID",
  "STORAGE_SECRET_ACCESS_KEY",
  "ADMIN_PASSWORD_HASH",
  "ADMIN_SESSION_SECRET",
  "AUDIT_ENCRYPTION_KEY",
  "AUDIT_HASH_SECRET",
  "UNSUBSCRIBE_SECRET",
  "GOOGLE_MAPS_API_KEY"
] as const;

export async function GET() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]?.trim());
  let database = false;
  let databaseError = false;

  if (process.env.DATABASE_URL) {
    try {
      await getDb().execute(sql`select 1 as ready`);
      database = true;
    } catch {
      databaseError = true;
    }
  }

  const ready = missing.length === 0 && database;
  return NextResponse.json({
    ok: ready,
    service: "verotask",
    status: ready ? "ready" : "not_ready",
    checks: {
      database,
      databaseError,
      productionConfigurationComplete: missing.length === 0,
      missingEnvironmentCount: missing.length,
      emailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
      storageConfigured: Boolean(process.env.STORAGE_ENDPOINT && process.env.STORAGE_BUCKET && process.env.STORAGE_ACCESS_KEY_ID && process.env.STORAGE_SECRET_ACCESS_KEY),
      paymentsConfigured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && process.env.STRIPE_WEBHOOK_SECRET),
      scheduledJobsConfigured: Boolean(process.env.CRON_SECRET),
      geocodingConfigured: Boolean(process.env.GOOGLE_MAPS_API_KEY)
    },
    timestamp: new Date().toISOString()
  }, {
    status: ready ? 200 : 503,
    headers: { "cache-control": "no-store" }
  });
}
