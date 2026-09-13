import { DEFAULT_REGION } from "@/services/location";
import type { Coordinates } from "@/types/location";

/** City-level zoom used when framing the fallback region (no saved places). */
const DEFAULT_ZOOM = 11;
/** Zoom used when there's a single place to frame. */
const SINGLE_PLACE_ZOOM = 15;
/** Clamp so a lone/clustered set doesn't over-zoom and a spread-out set stays sane. */
const MIN_ZOOM = 2;
const MAX_ZOOM = 15;
/** Extra span left as margin so outermost markers aren't flush against the edge. */
const PADDING_FACTOR = 1.5;
/** Guards against a zero span (identical coordinates) blowing up the log. */
const MIN_SPAN_DEG = 0.01;

export type CameraTarget = { coordinates: Coordinates; zoom: number };

/**
 * Computes a camera center + zoom that frames every place. expo-maps'
 * `GoogleMaps.View` has no fit-to-bounds API, so we derive the center from the
 * coordinate bounding box and approximate a Google zoom level from its span
 * (zoom `z` shows ~`360 / 2^z` degrees across the map width). It's an
 * approximation — good enough to bring all pins into view — and falls back to
 * `DEFAULT_REGION` when there are no places.
 */
export function getCameraForPlaces(coords: Coordinates[]): CameraTarget {
  if (coords.length === 0) {
    return { coordinates: DEFAULT_REGION, zoom: DEFAULT_ZOOM };
  }
  if (coords.length === 1) {
    return { coordinates: coords[0], zoom: SINGLE_PLACE_ZOOM };
  }

  const lats = coords.map((c) => c.latitude);
  const lngs = coords.map((c) => c.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const center: Coordinates = {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
  };

  const span = Math.max(maxLat - minLat, maxLng - minLng, MIN_SPAN_DEG) * PADDING_FACTOR;
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.log2(360 / span)));

  return { coordinates: center, zoom };
}
