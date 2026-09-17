const VERIFIED_VERCEL_FALLBACK = "https://vero-task-andres-projects-bbfd1881.vercel.app";
const KNOWN_INVALID_ORIGINS = new Set([
  "https://vero-task.vercel.app"
]);

type HeaderReader = { get(name: string): string | null };

function normalizeOrigin(value?: string | null) {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;
  try {
    const candidate = raw.includes("://") ? raw : `https://${raw}`;
    const url = new URL(candidate);
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") return null;
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function usableOrigin(value?: string | null) {
  const origin = normalizeOrigin(value);
  if (!origin || KNOWN_INVALID_ORIGINS.has(origin)) return null;
  return origin;
}

export function canonicalAppUrl() {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL
  ];
  for (const candidate of candidates) {
    const origin = usableOrigin(candidate);
    if (origin) return origin;
  }
  return process.env.NODE_ENV === "production" ? VERIFIED_VERCEL_FALLBACK : "http://localhost:3000";
}

export function requestAppUrl(requestOrigin?: string | null) {
  return usableOrigin(requestOrigin) ?? canonicalAppUrl();
}

export function appUrlFromHeaders(headers: HeaderReader) {
  const forwardedHost = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || headers.get("host")?.split(",")[0]?.trim();
  if (!host) return canonicalAppUrl();
  const forwardedProto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || (process.env.NODE_ENV === "production" ? "https" : "http");
  return requestAppUrl(`${protocol}://${host}`);
}
