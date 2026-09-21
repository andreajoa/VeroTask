import { createHash, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { platformSecrets } from "@/db/analytics-schema";

function equal(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function authorizeEmailCron(authorization: string | null) {
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token || token.length > 256) return false;
  const secret = process.env.CRON_SECRET;
  if (secret && equal(token, secret)) return true;
  if (token.length < 32) return false;
  // A separate hashed credential authorizes only email recovery, never CRM or
  // settlement. GitHub can run this on Vercel Hobby without a high-frequency cron.
  const [credential] = await getDb().select({ hash: platformSecrets.secretValue }).from(platformSecrets)
    .where(eq(platformSecrets.id, "github_email_cron_sha256")).limit(1);
  if (!credential) return false;
  return equal(createHash("sha256").update(token).digest("hex"), credential.hash);
}
