import type { Coordinates } from "@/types/location";

/** Mean Earth radius in meters, used by the haversine distance formula below. */
const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Great-circle distance between two coordinates in meters (haversine formula).
 * Used to seed geofence occupancy state from the device's current position —
 * see `services/geofencing.ts` — since Expo's geofencing API only reports
 * enter/exit transitions, not whether a point is currently inside a region.
 */
export function distanceMeters(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}
