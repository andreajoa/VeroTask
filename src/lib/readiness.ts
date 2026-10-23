const COMMON_ENVIRONMENT = [
  "NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SUPPORT_EMAIL", "AUTH_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET",
  "CRON_SECRET", "RESEND_API_KEY", "EMAIL_FROM", "ADMIN_SESSION_SECRET",
  "AUDIT_ENCRYPTION_KEY", "AUDIT_HASH_SECRET", "UNSUBSCRIBE_SECRET"
] as const;

// On Cloudflare the database and evidence bucket are Worker bindings (DB, R2), not
// connection strings, so their URL/key variables do not exist there.
const POSTGRES_S3_ENVIRONMENT = ["DATABASE_URL", "STORAGE_ENDPOINT", "STORAGE_BUCKET", "STORAGE_ACCESS_KEY_ID", "STORAGE_SECRET_ACCESS_KEY"] as const;
const D1_ENVIRONMENT = ["D1_STAGING_HTTP_URL", "D1_STAGING_BRIDGE_SECRET", "UPLOAD_SIGNING_SECRET"] as const;

export const REQUIRED_ENVIRONMENT: readonly string[] = process.env.DATABASE_BACKEND === "d1"
  ? [...COMMON_ENVIRONMENT, ...D1_ENVIRONMENT]
  : [...COMMON_ENVIRONMENT, ...POSTGRES_S3_ENVIRONMENT];

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
