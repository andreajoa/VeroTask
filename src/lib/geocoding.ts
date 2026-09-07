type GoogleGeocodeResult = {
  geometry?: { location?: { lat?: number; lng?: number } };
  formatted_address?: string;
};

type GoogleGeocodeResponse = {
  results?: GoogleGeocodeResult[];
};

export type GeocodedAddress = {
  latitude: number;
  longitude: number;
  matchedAddress?: string;
  source: "google-maps";
};

/**
 * Best-effort geocoding for Brazilian service addresses using Google Maps Geocoding API.
 * Biased towards São Paulo region. Booking must continue to work when geocoding is
 * unavailable; in that case GPS evidence is not treated as geofence-verified automatically.
 */
export async function geocodeAddress(address: string): Promise<GeocodedAddress | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);

  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return null;

    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", address);
    url.searchParams.set("components", "country:BR");
    url.searchParams.set("key", apiKey);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "VeroTask/1.0 (local-services marketplace)" },
      cache: "no-store"
    });
    if (!response.ok) return null;

    const data = await response.json() as GoogleGeocodeResponse;
    const result = data.results?.[0];
    const latitude = result?.geometry?.location?.lat;
    const longitude = result?.geometry?.location?.lng;
    if (typeof latitude !== "number" || typeof longitude !== "number") return null;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    return { latitude, longitude, matchedAddress: result?.formatted_address, source: "google-maps" };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
