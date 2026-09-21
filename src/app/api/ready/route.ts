import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { canonicalAppUrl } from "@/lib/app-url";
import { verifyEvidenceStorageAccess } from "@/lib/storage";
import { REQUIRED_ENVIRONMENT, readinessPassed } from "@/lib/readiness";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Dependencies = { database: boolean; schema: boolean; storageOperational: boolean };
let probe: { expiresAt: number; result: Promise<Dependencies> } | undefined;

function dependencies() {
  // Coalesce probes so public health polling cannot flood storage with writes.
  if (probe && probe.expiresAt > Date.now()) return probe.result;
  const result = (async () => {
    const [database, storage] = await Promise.allSettled([
      (async () => getDb().execute(sql`
        select to_regclass('public.users') is not null
          and to_regclass('public.sessions') is not null
          and to_regclass('public.bookings') is not null
          and to_regclass('public.provider_profile_photos') is not null
          and to_regclass('public.admin_credentials') is not null
          and to_regclass('public.platform_secrets') is not null
          and to_regclass('public.provider_checkout_sessions') is not null
          and to_regclass('public.transactional_email_outbox') is not null
          and to_regclass('public.admin_login_attempts') is not null as schema_ready
      `))(),
      verifyEvidenceStorageAccess()
    ]);
    const data = database.status === "fulfilled" ? database.value : null;
    const rows = Array.isArray(data) ? data : data?.rows;
    return {
      database: database.status === "fulfilled",
      schema: rows?.[0]?.schema_ready === true,
      storageOperational: storage.status === "fulfilled" && storage.value.ok
    };
  })();
  probe = { expiresAt: Date.now() + 30_000, result };
  return result;
}

export async function GET() {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";
  const checks = {
    ...await dependencies(),
    configuredAppUrlValid: configuredAppUrl === canonicalAppUrl()
      && (process.env.NODE_ENV !== "production" || configuredAppUrl.startsWith("https://")),
    requiredEnvironmentConfigured: REQUIRED_ENVIRONMENT.every((key) => Boolean(process.env[key]?.trim()))
  };
  const ready = readinessPassed(checks);
  return NextResponse.json({
    ok: ready,
    service: "verotask",
    market: "Orlando / Central Florida",
    paymentModel: "booking_fee_only",
    status: ready ? "ready" : "not_ready",
    checks: { ...checks, storage: checks.storageOperational, storageOptional: false },
    timestamp: new Date().toISOString()
  }, { status: ready ? 200 : 503, headers: { "cache-control": "no-store" } });
}
