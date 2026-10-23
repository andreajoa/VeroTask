const COMMON_ENVIRONMENT = [
  "NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SUPPORT_EMAIL", "AUTH_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET",
  "CRON_SECRET", "RESEND_API_KEY", "EMAIL_FROM", "ADMIN_SESSION_SECRET",
  "AUDIT_ENCRYPTION_KEY", "AUDIT_HASH_SECRET", "UNSUBSCRIBE_SECRET"
] as const;

// D1 is reached through the signed verotask-d1 Worker (DATABASE_BACKEND=d1) instead of a
// connection string. Evidence storage is either S3-compatible keys or, inside a Cloudflare
// Worker, the native R2 binding plus an upload-signing secret (STORAGE_BACKEND=r2-binding).
const DATABASE_ENVIRONMENT = process.env.DATABASE_BACKEND === "d1"
  ? ["D1_STAGING_HTTP_URL", "D1_STAGING_BRIDGE_SECRET"]
  : ["DATABASE_URL"];
const STORAGE_ENVIRONMENT = process.env.STORAGE_BACKEND === "r2-binding"
  ? ["UPLOAD_SIGNING_SECRET"]
  : ["STORAGE_ENDPOINT", "STORAGE_BUCKET", "STORAGE_ACCESS_KEY_ID", "STORAGE_SECRET_ACCESS_KEY"];

export const REQUIRED_ENVIRONMENT: readonly string[] = [...COMMON_ENVIRONMENT, ...DATABASE_ENVIRONMENT, ...STORAGE_ENVIRONMENT];

export type ReadinessChecks = {
  database: boolean;
  schema: boolean;
  storageOperational: boolean;
  configuredAppUrlValid: boolean;
  requiredEnvironmentConfigured: boolean;
};

export function readinessPassed(checks: ReadinessChecks) {
  return Object.values(checks).every(Boolean);
}
