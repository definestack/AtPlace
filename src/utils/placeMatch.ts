import type { Coordinates } from "@/types/location";
import type { Place } from "@/types/place";

import { distanceMeters } from "@/utils/geo";

/**
 * Coordinates within this distance of each other are treated as the same
 * physical place (issue #86) — GPS/geocoding jitter means a re-searched
 * result rarely lands on the exact same lat/lng as the saved place.
 */
export const SAME_PLACE_TOLERANCE_METERS = 25;

/**
 * Finds the saved place nearest to `coords`, if any is within
 * `toleranceMeters`. Used to detect that a searched location is already
 * saved, so the Map screen can offer that place instead of a duplicate save.
 */
export function findPlaceAt(
  places: Place[],
  coords: Coordinates,
  toleranceMeters = SAME_PLACE_TOLERANCE_METERS,
): Place | undefined {
  let nearest: Place | undefined;
  let nearestDistance = Infinity;

  for (const place of places) {
    const distance = distanceMeters(coords, { latitude: place.latitude, longitude: place.longitude });
    if (distance <= toleranceMeters && distance < nearestDistance) {
      nearest = place;
      nearestDistance = distance;
    }
  }

  return nearest;
}
