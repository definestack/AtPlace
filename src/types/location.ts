/** A single GPS fix: latitude/longitude in decimal degrees. */
export type Coordinates = {
  latitude: number;
  longitude: number;
};

/**
 * A human-readable label for a set of coordinates, produced by reverse
 * geocoding. `name` is a best-effort point-of-interest/street name (may be
 * absent); `address` is always a formatted display string.
 */
export type PlaceAddress = {
  name?: string;
  address: string;
};
