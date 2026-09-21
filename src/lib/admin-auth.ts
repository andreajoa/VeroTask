import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { adminCredentials, adminLoginAttempts } from "@/db/analytics-schema";

const COOKIE_NAME = "verotask_admin";
const SESSION_HOURS = 8;
const ATTEMPT_WINDOW_MINUTES = 15;
const MAX_ATTEMPTS = 5;

type SessionPayload = {
  v: 1;
  exp: number;
  nonce: string;
};

function sessionSecret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("ADMIN_SESSION_SECRET must be at least 32 characters");
  return value;
}

function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

function encode(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode(value?: string | null): SessionPayload | null {
  if (!value) return null;
  const [body, signature] = value.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (payload.v !== 1 || !payload.exp || payload.exp <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function adminLoginRiskKey(ip: string | null) {
  const normalizedIp = (ip ?? "unknown").split(",")[0]?.trim().slice(0, 96) || "unknown";
  return createHmac("sha256", sessionSecret()).update(normalizedIp).digest("hex");
}

export async function consumeAdminLoginAttempt(keyHash: string) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - ATTEMPT_WINDOW_MINUTES * 60 * 1000);
  const db = getDb();
  // Reserve the attempt before checking the password, including concurrent requests.
  const [attempt] = await db.insert(adminLoginAttempts).values({ keyHash, failureCount: 1, windowStartedAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: adminLoginAttempts.keyHash,
      set: {
        failureCount: sql`case when ${adminLoginAttempts.windowStartedAt} < ${windowStart} then 1 else least(${adminLoginAttempts.failureCount} + 1, ${MAX_ATTEMPTS + 1}) end`,
        windowStartedAt: sql`case when ${adminLoginAttempts.windowStartedAt} < ${windowStart} then ${now} else ${adminLoginAttempts.windowStartedAt} end`,
        updatedAt: now
      }
    }).returning();
  return { allowed: Boolean(attempt && attempt.failureCount <= MAX_ATTEMPTS) };
}

export async function clearAdminLoginFailures(keyHash: string) {
  await getDb().delete(adminLoginAttempts).where(eq(adminLoginAttempts.keyHash, keyHash));
}

export async function verifyAdminPassword(input: string) {
  let encoded: string | undefined;
  if (process.env.DATABASE_URL) {
    const [credential] = await getDb().select().from(adminCredentials).where(eq(adminCredentials.id, "primary")).limit(1);
    encoded = credential?.passwordHash || undefined;
  }
  encoded = encoded || process.env.ADMIN_PASSWORD_HASH?.trim();
  if (!encoded) throw new Error("ADMIN_PASSWORD_HASH is not configured");
  const [scheme, saltHex, hashHex] = encoded.split(/[$:]/);
  if (scheme !== "scrypt" || !saltHex || !hashHex) throw new Error("ADMIN_PASSWORD_HASH has invalid format");
  const derived = scryptSync(input, Buffer.from(saltHex, "hex"), 64);
  const expected = Buffer.from(hashHex, "hex");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

export async function createAdminSession() {
  const expiresAt = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, encode({ v: 1, exp: expiresAt, nonce: randomBytes(16).toString("hex") }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(expiresAt)
  });
}

export async function isAdminSession() {
  const cookieStore = await cookies();
  return Boolean(decode(cookieStore.get(COOKIE_NAME)?.value));
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
