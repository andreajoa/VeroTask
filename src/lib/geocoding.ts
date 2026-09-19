type CensusMatch = {
  coordinates?: { x?: number; y?: number };
  matchedAddress?: string;
};

type CensusResponse = {
  result?: { addressMatches?: CensusMatch[] };
};

type ZipResponse = {
  places?: Array<{
    latitude?: string;
    longitude?: string;
    "place name"?: string;
    state?: string;
  }>;
};

export type GeocodedAddress = {
  latitude: number;
  longitude: number;
  matchedAddress?: string;
  source: "us-census" | "zippopotam";
};

const postalCache = new Map<string, { value: GeocodedAddress | null; expiresAt: number }>();
const POSTAL_CACHE_MS = 24 * 60 * 60 * 1000;

/**
 * Best-effort geocoding for US service addresses using the public US Census
 * Geocoder. Booking must continue to work when geocoding is unavailable; in
 * that case GPS evidence is not treated as geofence-verified automatically.
 */
export async function geocodeUsAddress(address: string): Promise<GeocodedAddress | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);

  try {
    const url = new URL("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress");
    url.searchParams.set("address", address);
    url.searchParams.set("benchmark", "Public_AR_Current");
    url.searchParams.set("format", "json");

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "VeroTask/1.0 (local-services marketplace)" },
      cache: "no-store"
    });
    if (!response.ok) return null;

    const data = await response.json() as CensusResponse;
    const match = data.result?.addressMatches?.[0];
    const longitude = match?.coordinates?.x;
    const latitude = match?.coordinates?.y;
    if (typeof latitude !== "number" || typeof longitude !== "number") return null;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    return { latitude, longitude, matchedAddress: match?.matchedAddress, source: "us-census" };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function geocodeUsPostalCode(postalCodeInput: string): Promise<GeocodedAddress | null> {
  const postalCode = postalCodeInput.trim().slice(0, 5);
  if (!/^\d{5}$/.test(postalCode)) return null;

  const cached = postalCache.get(postalCode);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(`https://api.zippopotam.us/us/${postalCode}`, {
      signal: controller.signal,
      headers: { "user-agent": "VeroTask/1.0 (local-services marketplace)" },
      cache: "force-cache"
    });
    if (!response.ok) {
      postalCache.set(postalCode, { value: null, expiresAt: Date.now() + POSTAL_CACHE_MS });
      return null;
    }

    const data = await response.json() as ZipResponse;
    const place = data.places?.[0];
    const latitude = Number(place?.latitude);
    const longitude = Number(place?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      postalCache.set(postalCode, { value: null, expiresAt: Date.now() + POSTAL_CACHE_MS });
      return null;
    }

    const value: GeocodedAddress = {
      latitude,
      longitude,
      matchedAddress: [place?.["place name"], place?.state, postalCode].filter(Boolean).join(", "),
      source: "zippopotam"
    };
    postalCache.set(postalCode, { value, expiresAt: Date.now() + POSTAL_CACHE_MS });
    return value;
  } catch {
    postalCache.set(postalCode, { value: null, expiresAt: Date.now() + 5 * 60 * 1000 });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
