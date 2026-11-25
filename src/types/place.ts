import type { Ionicons } from "@expo/vector-icons";

/** Icon glyph used for a place, drawn from the shared Ionicons set. */
export type PlaceIconName = keyof typeof Ionicons.glyphMap;

/**
 * Tint used for a place's icon background. Maps to brand color tokens in
 * `theme/colors.ts` / `tailwind.config.js` (e.g. `bg-teal`, `bg-plum`).
 */
export type PlaceColor = "teal" | "plum" | "mint" | "coral";

/** A saved location the user has associated reminders with. */
export type Place = {
  id: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  icon: PlaceIconName;
  color: PlaceColor;
  /** Geofence trigger radius in meters (issue #10). */
  radius: number;
  reminderCount: number;
};

/**
 * Input for creating a new place — `reminderCount` starts at 0 server-side.
 * `radius` is optional; omitted values fall back to `DEFAULT_GEOFENCE_RADIUS_M`
 * (see `db/placesRepository.ts`) for callers that don't surface the radius
 * picker (e.g. restoring a backup that predates it).
 */
export type NewPlace = Omit<Place, "reminderCount" | "radius"> & { radius?: number };

/**
 * Editable fields for an existing place (issue #87) — name, address,
 * location and geofence trigger radius (issue #126). Icon and color aren't
 * editable yet (no picker UI).
 */
export type PlaceUpdate = Pick<Place, "name" | "address" | "latitude" | "longitude" | "radius">;
