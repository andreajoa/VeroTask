const VERIFIED_PRODUCTION_ORIGIN = "https://www.verotask.online";
const KNOWN_INVALID_ORIGINS = new Set([
  "https://vero-task.vercel.app",
  "https://vero-task-andres-projects-bbfd1881.vercel.app"
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
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function usableOrigin(value?: string | null) {
  const origin = normalizeOrigin(value);
  if (!origin || KNOWN_INVALID_ORIGINS.has(origin)) return null;
  if (process.env.NODE_ENV === "production" && origin.endsWith(".vercel.app")) return null;
  return origin;
}

export function canonicalAppUrl() {
  // Production auth, email and payment callbacks are deliberately pinned to the
  // public custom domain. Preview/deployment aliases must never escape to users.
  if (process.env.NODE_ENV === "production") return VERIFIED_PRODUCTION_ORIGIN;

  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL
  ];
  for (const candidate of candidates) {
    const origin = usableOrigin(candidate);
    if (origin) return origin;
  }
  return "http://localhost:3000";
}

export function requestAppUrl(requestOrigin?: string | null) {
  const canonical = canonicalAppUrl();
  // Never let a request Host/Origin control absolute auth or payment redirects in production.
  if (process.env.NODE_ENV === "production") return canonical;
  return usableOrigin(requestOrigin) ?? canonical;
}

export function appUrlFromHeaders(headers: HeaderReader) {
  if (process.env.NODE_ENV === "production") return canonicalAppUrl();

  const forwardedHost = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || headers.get("host")?.split(",")[0]?.trim();
  if (!host) return canonicalAppUrl();
  const forwardedProto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || "http";
  return requestAppUrl(`${protocol}://${host}`);
}
