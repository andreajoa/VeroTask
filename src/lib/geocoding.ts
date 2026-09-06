type CensusMatch = {
  coordinates?: { x?: number; y?: number };
  matchedAddress?: string;
};

type CensusResponse = {
  result?: { addressMatches?: CensusMatch[] };
};

export type GeocodedAddress = {
  latitude: number;
  longitude: number;
  matchedAddress?: string;
  source: "us-census";
};

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
