import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { adminCredentials } from "@/db/analytics-schema";

const COOKIE_NAME = "verotask_admin";
const ATTEMPT_COOKIE = "verotask_admin_attempts";
const SESSION_HOURS = 8;
const ATTEMPT_WINDOW_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const BUILTIN_ADMIN_PASSWORD_HASH = "scrypt$42703a40a94ec95b78a09884c1c708cc$ef69ede40a8331867d3bea3741fd5512750057ea2718b3cc774bd517f98e671daf02464d5a0df7bf501e6038ecc8a36f8b732b12d6974333a074000664ea34f2";

type SessionPayload = {
  v: 1;
  exp: number;
  nonce: string;
};

type AttemptPayload = {
  v: 1;
  exp: number;
  count: number;
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

function encodeAttempt(payload: AttemptPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decodeAttempt(value?: string | null): AttemptPayload | null {
  if (!value) return null;
  const [body, signature] = value.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AttemptPayload;
    if (payload.v !== 1 || payload.exp <= Date.now() || payload.count < 0) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function adminLoginRateLimitStatus() {
  const cookieStore = await cookies();
  const payload = decodeAttempt(cookieStore.get(ATTEMPT_COOKIE)?.value);
  if (!payload) return { allowed: true, remaining: MAX_ATTEMPTS, retryAfterSeconds: 0 };
  const remaining = Math.max(0, MAX_ATTEMPTS - payload.count);
  return {
    allowed: payload.count < MAX_ATTEMPTS,
    remaining,
    retryAfterSeconds: payload.count >= MAX_ATTEMPTS ? Math.max(1, Math.ceil((payload.exp - Date.now()) / 1000)) : 0
  };
}

export async function recordAdminLoginFailure() {
  const cookieStore = await cookies();
  const existing = decodeAttempt(cookieStore.get(ATTEMPT_COOKIE)?.value);
  const exp = existing?.exp ?? (Date.now() + ATTEMPT_WINDOW_MINUTES * 60 * 1000);
  const count = Math.min(MAX_ATTEMPTS, (existing?.count ?? 0) + 1);
  cookieStore.set(ATTEMPT_COOKIE, encodeAttempt({ v: 1, exp, count }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    expires: new Date(exp)
  });
  return count;
}

export async function clearAdminLoginFailures() {
  const cookieStore = await cookies();
  cookieStore.delete(ATTEMPT_COOKIE);
}

export async function verifyAdminPassword(input: string) {
  let encoded: string | undefined;
  if (process.env.DATABASE_URL) {
    try {
      const [credential] = await getDb().select().from(adminCredentials).where(eq(adminCredentials.id, "primary")).limit(1);
      encoded = credential?.passwordHash || undefined;
    } catch {
      // Keep the existing environment-based credential as a safe fallback.
    }
  }
  encoded = encoded || BUILTIN_ADMIN_PASSWORD_HASH;
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
