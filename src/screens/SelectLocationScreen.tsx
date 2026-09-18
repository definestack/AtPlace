import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { GoogleMaps } from "expo-maps";
import { useColorScheme } from "nativewind";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LocationSearchBar } from "@/components/LocationSearchBar";
import { LocationSearchResults } from "@/components/LocationSearchResults";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SelectedPlaceCard } from "@/components/SelectedPlaceCard";
import {
  DEFAULT_REGION,
  getCurrentCoordinates,
  LocationPermissionDeniedError,
  reverseGeocode,
} from "@/services/location";
import { PlacesSearchError, searchPlaces } from "@/services/placesSearch";
import { colors } from "@/theme/colors";
import type { Coordinates, PlaceSearchResult } from "@/types/location";

/** Debounce before reverse-geocoding while the map is being panned. */
const REVERSE_GEOCODE_DELAY_MS = 600;
const INITIAL_ZOOM = 16;

/**
 * Select Location screen (mockup #4, issue #6) — reached from the Add Place
 * options screen via "Select on map" or "Enter address". The pin is fixed
 * at the screen center; the user pans the map underneath it (expo-maps'
 * `GoogleMaps.View` has no marker drag-end event, so a center-fixed pin +
 * `onCameraMove` is the reliable way to capture the selection). Tapping the
 * map or searching an address re-centers the camera onto that pin.
 */
export function SelectLocationScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const { focusSearch } = useLocalSearchParams<{ focusSearch?: string }>();
  const mapRef = useRef<GoogleMaps.MapView>(null);
  const reverseGeocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasCustomName = useRef(false);

  const [initialCoords, setInitialCoords] = useState<Coordinates | null>(null);
  const [pinCoords, setPinCoords] = useState<Coordinates | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [addressLoading, setAddressLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Resolve the starting region once: current GPS location, falling back to
  // a default region if permission is denied (mirrors AddPlaceScreen).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const coords = await getCurrentCoordinates();
        if (!cancelled) setInitialCoords(coords);
      } catch {
        if (!cancelled) setInitialCoords(DEFAULT_REGION);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (reverseGeocodeTimer.current) clearTimeout(reverseGeocodeTimer.current);
    };
  }, []);

  const refreshAddress = (coords: Coordinates) => {
    if (reverseGeocodeTimer.current) clearTimeout(reverseGeocodeTimer.current);
    setAddressLoading(true);
    reverseGeocodeTimer.current = setTimeout(async () => {
      try {
        const result = await reverseGeocode(coords);
        setAddress(result?.address ?? "");
        if (!hasCustomName.current) setName(result?.name ?? "");
      } catch {
        setAddress("");
      } finally {
        setAddressLoading(false);
      }
    }, REVERSE_GEOCODE_DELAY_MS);
  };

  // expo-maps reports coordinates as possibly-undefined lat/lng; the map is
  // never rendered until `initialCoords` resolves, so in practice these are
  // always present, but we still guard defensively before using them.
  const toCoordinates = (raw: {
    latitude?: number;
    longitude?: number;
  }): Coordinates | null => {
    if (raw.latitude === undefined || raw.longitude === undefined) return null;
    return { latitude: raw.latitude, longitude: raw.longitude };
  };

  const handleCameraMove = (event: { coordinates: { latitude?: number; longitude?: number } }) => {
    const coords = toCoordinates(event.coordinates);
    if (!coords) return;
    setPinCoords(coords);
    refreshAddress(coords);
  };

  const handleMapClick = (event: { coordinates: { latitude?: number; longitude?: number } }) => {
    const coords = toCoordinates(event.coordinates);
    if (!coords) return;
    mapRef.current?.setCameraPosition({ coordinates: coords, duration: 250 });
  };

  const handleSearchSubmit = async () => {
    setSearchLoading(true);
    try {
      const results = await searchPlaces(searchQuery);
      if (results.length === 0) {
        Alert.alert("No results", `We couldn't find "${searchQuery}". Try a different search.`);
        return;
      }
      // Always show the list, even for a single match, so selecting a place
      // behaves the same way regardless of how many results came back
      // (issue #30 — searches that share a name must all be reachable).
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
    hasCustomName.current = true;
    setName(result.name);
    // Pin position + address refresh from here on are handled by the
    // onCameraMove event this triggers, same as handleMapClick below.
    mapRef.current?.setCameraPosition({
      coordinates: result.coordinates,
      zoom: INITIAL_ZOOM,
      duration: 300,
    });
  };

  const handleRecenter = async () => {
    try {
      const coords = await getCurrentCoordinates();
      mapRef.current?.setCameraPosition({ coordinates: coords, zoom: INITIAL_ZOOM, duration: 300 });
    } catch (error) {
      const message =
        error instanceof LocationPermissionDeniedError
          ? "AtPlace needs location access to find where you are. You can allow it in your device settings."
          : "We couldn't get your current location. Please try again.";
      Alert.alert("Location unavailable", message);
    }
  };

  const handleNameChange = (value: string) => {
    hasCustomName.current = true;
    setName(value);
  };

  const handleSave = () => {
    const coords = pinCoords ?? initialCoords;
    if (!coords) return;
    router.push({
      pathname: "/add-place/details",
      params: {
        latitude: String(coords.latitude),
        longitude: String(coords.longitude),
        name,
        address,
      },
    });
  };

  const iconColor = colorScheme === "dark" ? colors.white : colors.navy;

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-navy-deep" edges={["top", "left", "right"]}>
      <ScreenHeader title="Select Location" onBack={() => router.back()} />

      {!initialCoords ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={iconColor} />
        </View>
      ) : (
        <>
          <LocationSearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmit={handleSearchSubmit}
            autoFocus={focusSearch === "true"}
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
              cameraPosition={{ coordinates: initialCoords, zoom: INITIAL_ZOOM }}
              properties={{ isMyLocationEnabled: true }}
              onCameraMove={handleCameraMove}
              onMapClick={handleMapClick}
            />

            {/* Pin fixed at screen center; the map pans underneath it. */}
            <View
              pointerEvents="none"
              className="absolute left-1/2 top-1/2"
              style={{ marginLeft: -16, marginTop: -32 }}
            >
              <Ionicons name="location" size={32} color={colors.coral} />
            </View>

            <Pressable
              onPress={handleRecenter}
              className="absolute bottom-4 right-4 h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-surfaceDark"
            >
              <Ionicons name="locate" size={20} color={iconColor} />
            </Pressable>
          </View>

          <SelectedPlaceCard
            name={name}
            address={address}
            loading={addressLoading}
            onNameChange={handleNameChange}
            onSave={handleSave}
          />
        </>
      )}
    </SafeAreaView>
  );
}
