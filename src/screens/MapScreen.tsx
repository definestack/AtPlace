import { GoogleMaps } from "expo-maps";
import { useColorScheme } from "nativewind";
import { useEffect, useMemo, useRef } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { usePlacesStore } from "@/store/placesStore";
import { colors } from "@/theme/colors";
import type { Place } from "@/types/place";
import { getCameraForPlaces } from "@/utils/mapBounds";

/** Alpha suffix (~20%) appended to a place color hex for the geofence fill. */
const CIRCLE_FILL_ALPHA = "33";

/**
 * Places Map (issue #11): shows every saved place on a `GoogleMaps.View`. Each
 * place is drawn as a tappable pin (callout reveals its name) sitting inside a
 * translucent geofence circle tinted with the place's color — expo-maps pins
 * can't be recolored without image assets, so the circle carries the color and
 * doubles as a preview of the trigger radius. The camera is framed to fit all
 * places, falling back to `DEFAULT_REGION` (via `getCameraForPlaces`) when none
 * exist yet.
 */
export function MapScreen() {
  const { colorScheme } = useColorScheme();
  const places = usePlacesStore((state) => state.places);
  const mapRef = useRef<GoogleMaps.MapView>(null);

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

  const markers = useMemo<GoogleMaps.Marker[]>(
    () =>
      places.map((place) => ({
        id: place.id,
        coordinates: { latitude: place.latitude, longitude: place.longitude },
        title: place.name,
        snippet: place.address,
        showCallout: true,
      })),
    [places],
  );

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
