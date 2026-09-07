import { createHmac, timingSafeEqual } from "node:crypto";
import path from "node:path";

export function localStorageEnabled() {
  const hostname = new URL(process.env.NEXT_PUBLIC_APP_URL || "https://verotask.com").hostname;
  return process.env.STORAGE_DRIVER === "local" && !process.env.VERCEL && ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
}

function signature(method: string, key: string, expires: string, contentType: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("storage_secret_not_configured");
  return createHmac("sha256", secret).update(JSON.stringify([method, key, expires, contentType])).digest("hex");
}

export function localObjectPath(key: string) {
  if (!/^booking-evidence\/[0-9a-f-]{36}\/(before|after)\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(key)) throw new Error("invalid_storage_key");
  return path.join(process.cwd(), ".local", "evidence", key);
}

export function signedLocalStorageUrl(method: "GET" | "PUT", key: string, contentType = "") {
  localObjectPath(key);
  const expires = String(Date.now() + (method === "GET" ? 5 : 10) * 60_000);
  const query = new URLSearchParams({ key, expires, contentType, signature: signature(method, key, expires, contentType) });
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/local-storage?${query}`;
}

export function validateLocalStorageRequest(request: Request) {
  if (!localStorageEnabled()) return null;
  const query = new URL(request.url).searchParams;
  const key = query.get("key") || "";
  const expires = query.get("expires") || "";
  const contentType = query.get("contentType") || "";
  const supplied = query.get("signature") || "";
  if (!/^\d+$/.test(expires) || Number(expires) <= Date.now() || Number(expires) > Date.now() + 10 * 60_000) return null;
  try {
    const a = Buffer.from(supplied, "hex");
    const b = Buffer.from(signature(request.method, key, expires, contentType), "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return { file: localObjectPath(key), contentType };
  } catch { return null; }
}
