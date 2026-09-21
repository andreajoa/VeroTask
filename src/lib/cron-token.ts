import { createHash, timingSafeEqual } from "node:crypto";
import { inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { platformSecrets } from "@/db/analytics-schema";

// The credential GitHub already holds for scheduled jobs on this deployment.
// The id is historical — it was created for email recovery — but it is the only
// hashed credential provisioned in production, and read-only monitors are
// allowed to accept it. Write jobs (settlement, CRM) still require CRON_SECRET.
export const GITHUB_SCHEDULED_JOB_CREDENTIAL = "github_email_cron_sha256";

function equal(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Reports whether any of these hashed credentials has been provisioned in this
 * deployment's database. A monitor that is silently unauthorized looks exactly
 * like a monitor that is passing, so the refusal has to say which it is.
 */
export async function hashedCronCredentialExists(secretIds: string[]) {
  const rows = await getDb().select({ id: platformSecrets.id }).from(platformSecrets)
    .where(inArray(platformSecrets.id, secretIds)).limit(1);
  return rows.length > 0;
}

/**
 * Authorizes a scheduled job with either CRON_SECRET or a hashed credential.
 * The accepted ids are listed per endpoint, so a token handed to GitHub reaches
 * only the endpoints that named it.
 */
export async function authorizeCronToken(authorization: string | null, secretIds: string[]) {
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token || token.length > 256) return false;
  const secret = process.env.CRON_SECRET;
  if (secret && equal(token, secret)) return true;
  if (token.length < 32) return false;
  const credentials = await getDb().select({ hash: platformSecrets.secretValue }).from(platformSecrets)
    .where(inArray(platformSecrets.id, secretIds));
  const candidate = createHash("sha256").update(token).digest("hex");
  return credentials.some((credential) => equal(candidate, credential.hash));
}
