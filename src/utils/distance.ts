import type { Units } from "@/store/settingsStore";

const METERS_PER_FOOT = 0.3048;

/**
 * Formats a geofence radius (always stored in meters) for display per the
 * user's Units setting (issue #126) — meters as-is, or feet rounded to the
 * nearest 10 for miles users, since a precise-looking foot value would imply
 * more accuracy than the underlying GPS radius has.
 */
export function formatRadius(meters: number, units: Units): string {
  if (units === "km") return `${Math.round(meters)} m`;

  const feet = meters / METERS_PER_FOOT;
  const roundedFeet = Math.round(feet / 10) * 10;
  return `${roundedFeet} ft`;
}
