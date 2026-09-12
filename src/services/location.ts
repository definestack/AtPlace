import * as Location from "expo-location";

import type { Coordinates } from "@/types/location";

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
