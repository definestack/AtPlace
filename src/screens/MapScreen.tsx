import { GoogleMaps } from "expo-maps";
import { useColorScheme } from "nativewind";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LocationSearchBar } from "@/components/LocationSearchBar";
import { LocationSearchResults } from "@/components/LocationSearchResults";
import { ScreenHeader } from "@/components/ScreenHeader";
import { PlacesSearchError, searchPlaces } from "@/services/placesSearch";
import { usePlacesStore } from "@/store/placesStore";
import { colors } from "@/theme/colors";
import type { Coordinates, PlaceSearchResult } from "@/types/location";
import type { Place } from "@/types/place";
import { getCameraForPlaces } from "@/utils/mapBounds";

/** Alpha suffix (~20%) appended to a place color hex for the geofence fill. */
const CIRCLE_FILL_ALPHA = "33";
/** Zoom level applied when recentering on a searched place (issue #50). */
const SEARCH_RESULT_ZOOM = 16;
/** Marker id for the temporary pin dropped on a searched place. */
const SEARCH_MARKER_ID = "__search__";

/**
 * Places Map (issue #11): shows every saved place on a `GoogleMaps.View`. Each
 * place is drawn as a tappable pin (callout reveals its name) sitting inside a
 * translucent geofence circle tinted with the place's color — expo-maps pins
 * can't be recolored without image assets, so the circle carries the color and
 * doubles as a preview of the trigger radius. The camera is framed to fit all
 * places, falling back to `DEFAULT_REGION` (via `getCameraForPlaces`) when none
 * exist yet.
 *
 * A search box (issue #50) lets the user find any place, reusing the same
 * Google Places search stack as the Select Location screen: submitting pans
 * the camera to the match and drops a temporary marker for it alongside the
 * saved places.
 */
export function MapScreen() {
  const { colorScheme } = useColorScheme();
  const places = usePlacesStore((state) => state.places);
  const mapRef = useRef<GoogleMaps.MapView>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchedPlace, setSearchedPlace] = useState<{
    name: string;
    coordinates: Coordinates;
  } | null>(null);

  const camera = useMemo(
    () =>
      getCameraForPlaces(
        places.map((place) => ({ latitude: place.latitude, longitude: place.longitude })),
      ),
    [places],
  );

  // Re-frame the map whenever the set of places changes (initial hydration,
  // or a place added elsewhere). `cameraPosition` only seeds the *initial*
  // camera, so we drive later updates imperatively via the ref.
  useEffect(() => {
    mapRef.current?.setCameraPosition({ ...camera, duration: 300 });
  }, [camera]);

  const markers = useMemo<GoogleMaps.Marker[]>(() => {
    const placeMarkers = places.map((place) => ({
      id: place.id,
      coordinates: { latitude: place.latitude, longitude: place.longitude },
      title: place.name,
      snippet: place.address,
      showCallout: true,
    }));

    if (!searchedPlace) return placeMarkers;

    return [
      ...placeMarkers,
      {
        id: SEARCH_MARKER_ID,
        coordinates: searchedPlace.coordinates,
        title: searchedPlace.name,
        showCallout: true,
      },
    ];
  }, [places, searchedPlace]);

  const handleSearchSubmit = async () => {
    setSearchLoading(true);
    try {
      const results = await searchPlaces(searchQuery);
      if (results.length === 0) {
        Alert.alert("No results", `We couldn't find "${searchQuery}". Try a different search.`);
        return;
      }
      setSearchResults(results);
    } catch (error) {
      const message =
        error instanceof PlacesSearchError
          ? error.message
          : "We couldn't complete the search. Please try again.";
      Alert.alert("Search failed", message);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectResult = (result: PlaceSearchResult) => {
    setSearchResults([]);
    setSearchQuery(result.name);
    setSearchedPlace({ name: result.name, coordinates: result.coordinates });
    mapRef.current?.setCameraPosition({
      coordinates: result.coordinates,
      zoom: SEARCH_RESULT_ZOOM,
      duration: 300,
    });
  };

  const circles = useMemo<GoogleMaps.Circle[]>(
    () =>
      places.map((place) => ({
        id: place.id,
        center: { latitude: place.latitude, longitude: place.longitude },
        radius: place.radius,
        color: colorForPlace(place) + CIRCLE_FILL_ALPHA,
        lineColor: colorForPlace(place),
        lineWidth: 2,
      })),
    [places],
  );

  const mapColorScheme =
    colorScheme === "dark" ? GoogleMaps.MapColorScheme.DARK : GoogleMaps.MapColorScheme.LIGHT;

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-brand-deep" edges={["top", "left", "right"]}>
      <ScreenHeader title="Map" />

      <LocationSearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        onSubmit={handleSearchSubmit}
      />

      {(searchLoading || searchResults.length > 0) && (
        <LocationSearchResults
          results={searchResults}
          loading={searchLoading}
          onSelect={handleSelectResult}
        />
      )}

      <View className="relative mt-4 flex-1 overflow-hidden">
        <GoogleMaps.View
          ref={mapRef}
          style={{ flex: 1 }}
          cameraPosition={camera}
          markers={markers}
          circles={circles}
          colorScheme={mapColorScheme}
          properties={{ isMyLocationEnabled: true }}
        />

        {places.length === 0 ? (
          <View pointerEvents="none" className="absolute inset-x-0 top-4 items-center">
            <Text className="rounded-full bg-white px-4 py-2 text-sm text-muted dark:bg-surfaceDark dark:text-mutedDark">
              No places saved yet
            </Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

/** Raw hex for a place's brand color (NativeWind classes can't reach map props). */
function colorForPlace(place: Place): string {
  return colors[place.color];
}
