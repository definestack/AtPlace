import { useRouter } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { SettingOptionsList } from "@/components/SettingOptionsList";
import { useThemeStore, type ThemeMode } from "@/store/themeStore";

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System default" },
];

/**
 * App Theme drill-in (Settings > App Theme, mockup #10). Selecting a value
 * writes to `themeStore` and applies immediately — `_layout.tsx` syncs it to
 * NativeWind's color scheme on every change.
 */
export function SettingsThemeScreen() {
  const router = useRouter();
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-brand-deep" edges={["top", "left", "right"]}>
      <ScreenHeader title="App Theme" onBack={() => router.back()} />
      <View className="mt-2">
        <SettingOptionsList options={THEME_OPTIONS} value={mode} onSelect={setMode} />
      </View>
    </SafeAreaView>
  );
}
