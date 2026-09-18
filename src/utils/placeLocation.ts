import type { Place } from "@/types/place";

/**
 * Formats coordinates as a compact, stable "lat, lng" string, fixed to 4
 * decimal places (~11m precision) so it reads well in a list row.
 */
export function formatCoordinates(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

/**
 * Returns a short location label for a saved place — the address when one
 * was saved, otherwise the coordinates. Used to disambiguate places that
 * share a name but sit at different locations (issue #24).
 */
export function getPlaceLocationLabel(
  place: Pick<Place, "address" | "latitude" | "longitude">,
): string {
  const trimmedAddress = place.address?.trim();
  if (trimmedAddress) return trimmedAddress;

  return formatCoordinates(place.latitude, place.longitude);
}
