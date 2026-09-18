import * as Location from "expo-location";

import type { Coordinates, PlaceAddress } from "@/types/location";

/**
 * Thrown when the user denies (or has previously denied) the foreground
 * location permission. Screens can catch this to show a friendly message
 * instead of a generic error.
 */
export class LocationPermissionDeniedError extends Error {
  constructor() {
    super("Location permission was not granted.");
    this.name = "LocationPermissionDeniedError";
  }
}

/**
 * Requests foreground location permission (if needed) and resolves with the
 * device's current GPS coordinates. Used by the "Use current location"
 * option on the Add Place screen (issue #5).
 */
export async function getCurrentCoordinates(): Promise<Coordinates> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== Location.PermissionStatus.GRANTED) {
    throw new LocationPermissionDeniedError();
  }

  const position = await Location.getCurrentPositionAsync();
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

/**
 * Fallback map region (central Bengaluru, matching the design mockups) used
 * when the current location can't be determined yet — e.g. permission
 * denied on first mount of the Select Location screen (issue #6).
 */
export const DEFAULT_REGION: Coordinates = {
  latitude: 12.9716,
  longitude: 77.5946,
};

/**
 * Reverse-geocodes coordinates to a display name/address for the Select
 * Location bottom card. Returns `null` if no address could be resolved.
 */
export async function reverseGeocode(coordinates: Coordinates): Promise<PlaceAddress | null> {
  const results = await Location.reverseGeocodeAsync(coordinates);
  const [first] = results;
  if (!first) return null;

  const address =
    first.formattedAddress ??
    [first.street, first.city, first.region].filter(Boolean).join(", ");

  if (!address) return null;

  return { name: first.name ?? undefined, address };
}
