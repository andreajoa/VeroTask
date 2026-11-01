import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users, bookings, providerProfilePhotos } from "@/db/schema";
import { sessions } from "@/db/auth-schema";
import { adminCredentials, platformSecrets, adminLoginAttempts } from "@/db/analytics-schema";
import { providerCheckoutSessions, transactionalEmailOutbox } from "@/db/operations-schema";
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
    // A portable schema probe: all queries compile with both Drizzle PostgreSQL
    // and SQLite, and LIMIT 0 verifies table/column presence without reading PII.
    // A database connection alone is not enough: missing tables must fail readiness.
    const [database, storage] = await Promise.allSettled([
      (async () => {
        const db = getDb();
        const checks = await Promise.allSettled([
          db.select({ id: users.id }).from(users).limit(0),
          db.select({ id: sessions.id }).from(sessions).limit(0),
          db.select({ id: bookings.id }).from(bookings).limit(0),
          db.select({ id: providerProfilePhotos.id }).from(providerProfilePhotos).limit(0),
          db.select({ id: adminCredentials.id }).from(adminCredentials).limit(0),
          db.select({ id: platformSecrets.id }).from(platformSecrets).limit(0),
          db.select({ id: providerCheckoutSessions.id }).from(providerCheckoutSessions).limit(0),
          db.select({ id: transactionalEmailOutbox.id }).from(transactionalEmailOutbox).limit(0),
          db.select({ id: adminLoginAttempts.keyHash }).from(adminLoginAttempts).limit(0)
        ]);
        return { database: checks[0].status === "fulfilled", schema: checks.every((c) => c.status === "fulfilled") };
      })(),
      verifyEvidenceStorageAccess()
    ]);
    return {
      database: database.status === "fulfilled" && database.value.database,
      schema: database.status === "fulfilled" && database.value.schema,
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
