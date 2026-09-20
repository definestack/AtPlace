import { useRouter } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { SettingOptionsList } from "@/components/SettingOptionsList";
import { useSettingsStore, type Units } from "@/store/settingsStore";

const UNITS_OPTIONS: { value: Units; label: string }[] = [
  { value: "km", label: "Kilometres (km)" },
  { value: "mi", label: "Miles (mi)" },
];

/**
 * Units drill-in (Settings > Units, mockup #10). Selecting a value persists
 * immediately via `settingsStore`.
 */
export function SettingsUnitsScreen() {
  const router = useRouter();
  const units = useSettingsStore((state) => state.units);
  const setUnits = useSettingsStore((state) => state.setUnits);

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-brand-deep" edges={["top", "left", "right"]}>
      <ScreenHeader title="Units" onBack={() => router.back()} />
      <View className="mt-2">
        <SettingOptionsList options={UNITS_OPTIONS} value={units} onSelect={setUnits} />
      </View>
    </SafeAreaView>
  );
}
