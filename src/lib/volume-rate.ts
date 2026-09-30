import { createHash, createPublicKey, verify, type KeyObject } from "node:crypto";

/**
 * Volume rate: a discount on VeroTask's own booking fee for customers who book many services
 * (for example, a property manager with dozens of rentals).
 *
 * VeroTask only ever charges the booking fee (see AGENTS.md §1), so this is the only amount a volume rate can
 * lower. The professional's service price is untouched and is still paid directly to the professional.
 *
 * The rate is granted by the VeroTask outreach system as a signed code, bound to one customer email. Only the
 * public key lives here, so the code cannot be forged, and the email is stored as a SHA-256 hash, so no personal
 * data is in this public repository. A granted rate is recorded on the booking as a `volume_rate_applied` event at
 * request time and read back when the fee is calculated, so the amount charged by Stripe is exactly the
 * `marketplaceFeeCents` written on the booking — the invariant validateBookingPayment depends on.
 */
export const VOLUME_RATE_COOKIE = "vt_volume_rate";
export const VOLUME_RATE_EVENT = "volume_rate_applied";
const MAX_OFF_BPS = 5_000;

const PUBLIC_KEY = createPublicKey(`-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAXstlF1qQPSVWfITNsPQoe+IVxPiUyEDafpnjmyRSxhU=
-----END PUBLIC KEY-----`);

export type VolumeRate = { id: string; emailHash: string; offBps: number; until: string };

export function emailHash(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 32);
}

/** Parse and verify a code `<base64url payload>.<base64url signature>`; null when anything is off. */
export function verifyVolumeRateCode(code: string | null | undefined, key: KeyObject = PUBLIC_KEY): VolumeRate | null {
  if (!code || code.length > 600) return null;
  const [body, signature] = code.split(".");
  if (!body || !signature) return null;
  try {
    const payload = Buffer.from(body, "base64url");
    if (!verify(null, payload, key, Buffer.from(signature, "base64url"))) return null;
    const data = JSON.parse(payload.toString("utf8")) as { i?: unknown; e?: unknown; o?: unknown; u?: unknown };
    if (typeof data.i !== "string" || typeof data.e !== "string" || typeof data.u !== "string") return null;
    if (!Number.isInteger(data.o) || (data.o as number) <= 0 || (data.o as number) > MAX_OFF_BPS) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.u)) return null;
    return { id: data.i, emailHash: data.e, offBps: data.o as number, until: data.u };
  } catch {
    return null;
  }
}

/** The rate this customer may use now, or null (wrong email, expired, invalid). */
export function volumeRateFor(code: string | null | undefined, email: string, now = new Date(), key: KeyObject = PUBLIC_KEY) {
  const rate = verifyVolumeRateCode(code, key);
  if (!rate || rate.emailHash !== emailHash(email)) return null;
  if (now.toISOString().slice(0, 10) > rate.until) return null;
  return rate;
}

/** Lower the booking fee by `offBps` (basis points of the fee). The provider amount never changes. */
export function applyVolumeRate<T extends { marketplaceFeeCents: number; commissionBps: number }>(amounts: T, offBps: number): T {
  if (!Number.isInteger(offBps) || offBps <= 0) return amounts;
  const off = Math.min(offBps, MAX_OFF_BPS);
  return {
    ...amounts,
    marketplaceFeeCents: Math.round((amounts.marketplaceFeeCents * (10_000 - off)) / 10_000),
    commissionBps: Math.round((amounts.commissionBps * (10_000 - off)) / 10_000)
  };
}
