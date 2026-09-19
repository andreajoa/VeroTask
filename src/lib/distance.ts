export type GeoPoint = {
  latitude: number;
  longitude: number;
};

const EARTH_RADIUS_MILES = 3958.7613;

function toRadians(value: number) {
  return value * Math.PI / 180;
}

export function distanceMiles(a: GeoPoint, b: GeoPoint) {
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLon = toRadians(b.longitude - a.longitude);

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

export function isWithinServiceRadius(provider: GeoPoint, customer: GeoPoint, radiusMiles: number) {
  if (!Number.isFinite(radiusMiles) || radiusMiles <= 0) return false;
  return distanceMiles(provider, customer) <= radiusMiles;
}
