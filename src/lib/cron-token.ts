import { createHash, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { platformSecrets } from "@/db/analytics-schema";

function equal(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Reports whether the hashed credential for a job has been provisioned in this
 * deployment's database. A monitor that is silently unauthorized looks exactly
 * like a monitor that is passing, so the refusal has to say which it is.
 */
export async function hashedCronCredentialExists(secretId: string) {
  const [credential] = await getDb().select({ id: platformSecrets.id }).from(platformSecrets)
    .where(eq(platformSecrets.id, secretId)).limit(1);
  return Boolean(credential);
}

/**
 * Authorizes a scheduled job with either CRON_SECRET or a hashed credential
 * scoped to one job. Each `secretId` stands for exactly one endpoint so a token
 * handed to GitHub cannot be replayed against settlement, CRM or email.
 */
export async function authorizeCronToken(authorization: string | null, secretId: string) {
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token || token.length > 256) return false;
  const secret = process.env.CRON_SECRET;
  if (secret && equal(token, secret)) return true;
  if (token.length < 32) return false;
  const [credential] = await getDb().select({ hash: platformSecrets.secretValue }).from(platformSecrets)
    .where(eq(platformSecrets.id, secretId)).limit(1);
  if (!credential) return false;
  return equal(createHash("sha256").update(token).digest("hex"), credential.hash);
}
