import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REQUIRED_ENV = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "CRON_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "STORAGE_ENDPOINT",
  "STORAGE_BUCKET",
  "STORAGE_ACCESS_KEY_ID",
  "STORAGE_SECRET_ACCESS_KEY",
  "ADMIN_PASSWORD_HASH",
  "ADMIN_SESSION_SECRET",
  "AUDIT_ENCRYPTION_KEY",
  "AUDIT_HASH_SECRET",
  "UNSUBSCRIBE_SECRET"
] as const;

export async function GET() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const productionUrlValid = process.env.NODE_ENV !== "production" || appUrl.startsWith("https://");
  const ready = missing.length === 0 && database && productionUrlValid;

  return NextResponse.json({
    ok: ready,
    service: "verotask",
    market: "Orlando / Central Florida",
    paymentModel: "booking_fee_only",
    status: ready ? "ready" : "not_ready",
    checks: {
      database,
      databaseError,
      productionUrlValid,
      requiredEnvironmentConfigured: missing.length === 0,
      missingEnvironmentCount: missing.length
    },
    timestamp: new Date().toISOString()
  }, {
    status: ready ? 200 : 503,
    headers: { "cache-control": "no-store" }
  });
}
