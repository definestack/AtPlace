import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AddPlaceOptionCard } from "@/components/AddPlaceOptionCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { getCurrentCoordinates, LocationPermissionDeniedError } from "@/services/location";

/**
 * Add Place options screen (issue #5 / mockup #3): lets the user choose how
 * to add a new place — current GPS location, or search/select on the map.
 * Each option navigates to the appropriate next screen:
 * - "Use current location" fetches GPS coordinates then goes to Place
 *   Details (issue #7, placeholder for now).
 * - "Search or select on map" goes to Select Location (issue #6), which
 *   combines address search and map selection on one screen.
 */
export function AddPlaceScreen() {
  const router = useRouter();
  const [locating, setLocating] = useState(false);

  const handleUseCurrentLocation = async () => {
    setLocating(true);
    try {
      const { latitude, longitude } = await getCurrentCoordinates();
      router.push({
        pathname: "/add-place/details",
        params: { latitude: String(latitude), longitude: String(longitude) },
      });
    } catch (error) {
      const message =
        error instanceof LocationPermissionDeniedError
          ? "AtPlace needs location access to save your current location as a place. You can allow it in your device settings."
          : "We couldn't get your current location. Please try again.";
      Alert.alert("Location unavailable", message);
    } finally {
      setLocating(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-brand-deep" edges={["top", "left", "right"]}>
      <ScreenHeader title="Add Place" onBack={() => router.back()} />

      <View className="gap-3 px-6 pt-6">
        <AddPlaceOptionCard
          icon="locate"
          title="Use current location"
          subtitle="Save your current location as a place"
          onPress={handleUseCurrentLocation}
          loading={locating}
        />
        <AddPlaceOptionCard
          icon="map-outline"
          title="Search or select on map"
          subtitle="Search an address or pick a spot on the map"
          onPress={() => router.push("/add-place/map")}
        />
      </View>
    </SafeAreaView>
  );
}
