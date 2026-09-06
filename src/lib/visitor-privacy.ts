import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";

function keyMaterial() {
  const raw = process.env.AUDIT_ENCRYPTION_KEY;
  if (!raw) return null;
  if (/^[a-f0-9]{64}$/i.test(raw)) return Buffer.from(raw, "hex");
  try {
    const decoded = Buffer.from(raw, "base64");
    return decoded.length === 32 ? decoded : null;
  } catch {
    return null;
  }
}

export function sessionKeyHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function ipHash(value: string) {
  const secret = process.env.AUDIT_HASH_SECRET || process.env.AUTH_SECRET || "verotask-development-only";
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function encryptIp(value: string) {
  const key = keyMaterial();
  if (!key) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptIp(value?: string | null) {
  const key = keyMaterial();
  if (!key || !value) return null;
  const [ivPart, tagPart, dataPart] = value.split(".");
  if (!ivPart || !tagPart || !dataPart) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivPart, "base64url"));
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(dataPart, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function requestIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || null;
}

function decodeHeader(value: string | null) {
  if (!value) return null;
  try { return decodeURIComponent(value); } catch { return value; }
}

export function requestGeo(headers: Headers) {
  return {
    countryCode: headers.get("x-vercel-ip-country")?.slice(0, 2).toUpperCase() || null,
    region: decodeHeader(headers.get("x-vercel-ip-country-region"))?.slice(0, 120) || null,
    city: decodeHeader(headers.get("x-vercel-ip-city"))?.slice(0, 120) || null,
    postalCode: decodeHeader(headers.get("x-vercel-ip-postal-code"))?.slice(0, 24) || null,
    timezone: decodeHeader(headers.get("x-vercel-ip-timezone"))?.slice(0, 80) || null
  };
}

export function deviceCategory(userAgent: string) {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet/.test(ua)) return "tablet";
  if (/iphone|android|mobile/.test(ua)) return "mobile";
  if (/bot|crawler|spider|slurp/.test(ua)) return "bot";
  return "desktop";
}

export function safePath(value?: string | null) {
  if (!value) return null;
  try {
    const parsed = new URL(value, "https://verotask.local");
    return parsed.pathname.slice(0, 800);
  } catch {
    return value.split("?")[0]?.slice(0, 800) || null;
  }
}

export function safeLabel(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim().slice(0, 180) || null;
}
