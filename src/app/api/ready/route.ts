import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { canonicalAppUrl } from "@/lib/app-url";
import { verifyEvidenceStorageAccess } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REQUIRED_ENV = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPPORT_EMAIL",
  "DATABASE_URL",
  "AUTH_SECRET",
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
  let storage = false;
  let storageError = false;

  if (process.env.DATABASE_URL) {
    try {
      await getDb().execute(sql`select 1 as ready`);
      database = true;
    } catch {
      databaseError = true;
    }
  }

  if (
    process.env.STORAGE_ENDPOINT &&
    process.env.STORAGE_BUCKET &&
    process.env.STORAGE_ACCESS_KEY_ID &&
    process.env.STORAGE_SECRET_ACCESS_KEY
  ) {
    try {
      storage = await verifyEvidenceStorageAccess();
      storageError = !storage;
    } catch {
      storageError = true;
    }
  }

  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";
  const appUrl = canonicalAppUrl();
  const productionUrlValid = process.env.NODE_ENV !== "production" || appUrl.startsWith("https://");
  const configuredAppUrlValid = process.env.NODE_ENV !== "production" || (
    configuredAppUrl.startsWith("https://") && configuredAppUrl !== "https://vero-task.vercel.app"
  );
  const staleConfiguredAppUrl = configuredAppUrl === "https://vero-task.vercel.app";
  const supportEmailConfigured = Boolean(process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim());
  const ready = missing.length === 0
    && database
    && storage
    && productionUrlValid
    && configuredAppUrlValid
    && !staleConfiguredAppUrl
    && supportEmailConfigured;

  return NextResponse.json({
    ok: ready,
    service: "verotask",
    market: "Orlando / Central Florida",
    paymentModel: "booking_fee_only",
    status: ready ? "ready" : "not_ready",
    checks: {
      database,
      databaseError,
      storage,
      storageError,
      productionUrlValid,
      configuredAppUrlValid,
      canonicalUrlResolved: Boolean(appUrl),
      staleConfiguredAppUrl,
      supportEmailConfigured,
      requiredEnvironmentConfigured: missing.length === 0,
      missingEnvironmentCount: missing.length,
      missingEnvironmentKeys: missing
    },
    timestamp: new Date().toISOString()
  }, {
    status: ready ? 200 : 503,
    headers: { "cache-control": "no-store" }
  });
}
