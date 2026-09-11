import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useThemeStore, type ThemeMode } from "@/store/themeStore";

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

/** Settings screen (footer tab): currently just the app theme preference. */
export function SettingsScreen() {
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-navy-deep" edges={["top", "left", "right"]}>
      <View className="px-6 pt-4">
        <Text className="text-2xl font-bold text-navy dark:text-white">Settings</Text>
      </View>

      <View className="mt-6 px-6">
        <Text className="mb-2 text-sm font-semibold text-muted dark:text-mutedDark">
          App Theme
        </Text>
        <View className="flex-row rounded-xl bg-track p-1 dark:bg-surfaceDark">
          {THEME_OPTIONS.map((option) => {
            const isActive = option.value === mode;
            return (
              <Pressable
                key={option.value}
                onPress={() => setMode(option.value)}
                className={`flex-1 items-center rounded-lg py-2 ${
                  isActive ? "bg-white dark:bg-navy" : ""
                }`}
              >
                <Text
                  className={
                    isActive
                      ? "font-semibold text-navy dark:text-white"
                      : "text-muted dark:text-mutedDark"
                  }
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}
