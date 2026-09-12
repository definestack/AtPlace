import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";

/**
 * Place Details screen (mockup #5) — reached from the Add Place options
 * screen via "Use current location". The name/address form and "Save
 * Place" persistence land in issue #7; for now this placeholder confirms
 * the fetched GPS coordinates were passed through correctly.
 */
export function PlaceDetailsScreen() {
  const router = useRouter();
  const { latitude, longitude } = useLocalSearchParams<{ latitude?: string; longitude?: string }>();

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-navy-deep" edges={["top", "left", "right"]}>
      <ScreenHeader title="Place Details" onBack={() => router.back()} />
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-base text-muted dark:text-mutedDark">Coming soon</Text>
        {latitude && longitude ? (
          <Text className="mt-2 text-center text-sm text-muted dark:text-mutedDark">
            {`Location: ${latitude}, ${longitude}`}
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
