import Constants from "expo-constants";

import type { PlaceSearchResult } from "@/types/location";

const PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

/**
 * Thrown when a place-name search can't be completed (missing API key,
 * network failure, or a non-OK response) — as opposed to a search that
 * completed successfully but matched nothing, which resolves to `[]`.
 */
export class PlacesSearchError extends Error {
  constructor(message = "We couldn't complete the search. Please try again.") {
    super(message);
    this.name = "PlacesSearchError";
  }
}

/**
 * Searches for places by free-text name/address using the Google Places API
 * (New) Text Search endpoint, returning every match so the caller can let
 * the user choose among places that share a name (issue #30). Reuses the
 * same key configured for expo-maps (see app.config.js `extra`); that key
 * must have "Places API (New)" enabled.
 */
export async function searchPlaces(query: string): Promise<PlaceSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const apiKey = Constants.expoConfig?.extra?.googlePlacesApiKey as string | undefined;
  if (!apiKey) {
    throw new PlacesSearchError("Place search isn't configured. Please contact support.");
  }

  let response: Response;
  try {
    response = await fetch(PLACES_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location",
      },
      body: JSON.stringify({ textQuery: trimmed }),
    });
  } catch (error) {
    console.error("Place search request failed:", error);
    throw new PlacesSearchError("We couldn't reach the search service. Check your connection.");
  }

  if (!response.ok) {
    console.error("Place search returned an error status:", response.status);
    throw new PlacesSearchError();
  }

  const data = (await response.json()) as {
    places?: {
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
    }[];
  };

  return (data.places ?? [])
    .map((place): PlaceSearchResult | null => {
      const { latitude, longitude } = place.location ?? {};
      const name = place.displayName?.text;
      const address = place.formattedAddress;
      if (latitude === undefined || longitude === undefined || !name || !address) return null;
      return { name, address, coordinates: { latitude, longitude } };
    })
    .filter((result): result is PlaceSearchResult => result !== null);
}
