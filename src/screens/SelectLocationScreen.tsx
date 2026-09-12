import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";

/**
 * Select Location screen (mockup #4) — reached from the Add Place options
 * screen via "Select on map" or "Enter address". The interactive map and
 * address search land in issue #6; this is a placeholder stub for now.
 */
export function SelectLocationScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-navy-deep" edges={["top", "left", "right"]}>
      <ScreenHeader title="Select Location" onBack={() => router.back()} />
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-base text-muted dark:text-mutedDark">Coming soon</Text>
      </View>
    </SafeAreaView>
  );
}
