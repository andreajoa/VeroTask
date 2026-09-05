import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { authTokens, sessions } from "@/db/auth-schema";
import { users } from "@/db/schema";

const SESSION_COOKIE = "verotask_session";
const SESSION_DAYS = 30;

function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function safeRedirectPath(value?: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value.slice(0, 500);
}

export async function createMagicLink(emailInput: string, redirectPath?: string | null) {
  const email = emailInput.trim().toLowerCase();
  const db = getDb();
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await db.insert(authTokens).values({
    email,
    tokenHash,
    expiresAt,
    redirectPath: safeRedirectPath(redirectPath)
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${baseUrl}/api/auth/verify?token=${encodeURIComponent(rawToken)}`;
}

export async function consumeMagicLink(rawToken: string) {
  const db = getDb();
  const tokenHash = hashToken(rawToken);
  const now = new Date();

  const [record] = await db.select().from(authTokens).where(and(
    eq(authTokens.tokenHash, tokenHash),
    gt(authTokens.expiresAt, now),
    isNull(authTokens.usedAt)
  )).limit(1);

  if (!record) return null;

  await db.update(authTokens).set({ usedAt: now }).where(eq(authTokens.id, record.id));

  let [user] = await db.select().from(users).where(eq(users.email, record.email)).limit(1);
  if (!user) {
    [user] = await db.insert(users).values({ email: record.email, role: "customer" }).returning();
  }

  const rawSession = randomBytes(32).toString("hex");
  const sessionHash = hashToken(rawSession);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({ userId: user.id, tokenHash: sessionHash, expiresAt });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, rawSession, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt
  });

  return { user, redirectPath: safeRedirectPath(record.redirectPath) };
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const rawSession = cookieStore.get(SESSION_COOKIE)?.value;
  if (!rawSession) return null;

  const db = getDb();
  const sessionHash = hashToken(rawSession);
  const now = new Date();

  const [row] = await db.select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, sessionHash), gt(sessions.expiresAt, now)))
    .limit(1);

  return row?.user ?? null;
}

export async function signOut() {
  const cookieStore = await cookies();
  const rawSession = cookieStore.get(SESSION_COOKIE)?.value;
  if (rawSession) {
    const db = getDb();
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(rawSession)));
  }
  cookieStore.delete(SESSION_COOKIE);
}
