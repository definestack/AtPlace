import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AddPlaceOptionCard } from "@/components/AddPlaceOptionCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { getCurrentCoordinates, LocationPermissionDeniedError } from "@/services/location";

/**
 * Add Place options screen (issue #5 / mockup #3): lets the user choose how
 * to add a new place — current GPS location, map selection, or address
 * search. Each option navigates to the appropriate next screen:
 * - "Use current location" fetches GPS coordinates then goes to Place
 *   Details (issue #7, placeholder for now).
 * - "Select on map" and "Enter address" both go to Select Location
 *   (issue #6, placeholder for now); address search focuses its search bar.
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
    <SafeAreaView className="flex-1 bg-cream dark:bg-navy-deep" edges={["top", "left", "right"]}>
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
          title="Select on map"
          subtitle="Choose a location from map"
          onPress={() => router.push("/add-place/map")}
        />

        <View className="flex-row items-center gap-3 py-1">
          <View className="h-px flex-1 bg-track dark:bg-surfaceDark" />
          <Text className="text-sm text-muted dark:text-mutedDark">OR</Text>
          <View className="h-px flex-1 bg-track dark:bg-surfaceDark" />
        </View>

        <AddPlaceOptionCard
          icon="location-outline"
          title="Enter address"
          subtitle="Search and select an address"
          onPress={() => router.push({ pathname: "/add-place/map", params: { focusSearch: "true" } })}
        />
      </View>
    </SafeAreaView>
  );
}
