export const REQUIRED_ENVIRONMENT = [
  "NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SUPPORT_EMAIL", "DATABASE_URL", "AUTH_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET",
  "CRON_SECRET", "RESEND_API_KEY", "EMAIL_FROM", "ADMIN_SESSION_SECRET",
  "AUDIT_ENCRYPTION_KEY", "AUDIT_HASH_SECRET", "UNSUBSCRIBE_SECRET",
  "STORAGE_ENDPOINT", "STORAGE_BUCKET", "STORAGE_ACCESS_KEY_ID", "STORAGE_SECRET_ACCESS_KEY"
] as const;

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
