import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SettingsRow } from "@/components/SettingsRow";
import { useSettingsStore } from "@/store/settingsStore";
import { useThemeStore } from "@/store/themeStore";

const THEME_LABEL: Record<"light" | "dark" | "system", string> = {
  light: "Light",
  dark: "Dark",
  system: "System default",
};

const UNITS_LABEL: Record<"km" | "mi", string> = {
  km: "Kilometres (km)",
  mi: "Miles (mi)",
};

/**
 * Settings screen (footer tab, mockup #10): notifications toggle, units and
 * app theme drill-ins, backup & restore, and about — each backed by
 * `settingsStore`/`themeStore` so changes persist and apply immediately.
 */
export function SettingsScreen() {
  const router = useRouter();
  const themeMode = useThemeStore((state) => state.mode);
  const units = useSettingsStore((state) => state.units);
  const notificationsEnabled = useSettingsStore((state) => state.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((state) => state.setNotificationsEnabled);
  const developerModeEnabled = useSettingsStore((state) => state.developerModeEnabled);
  const setDeveloperModeEnabled = useSettingsStore((state) => state.setDeveloperModeEnabled);

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-brand-deep" edges={["top", "left", "right"]}>
      <View className="px-6 pt-4">
        <Text className="text-2xl font-bold text-brand dark:text-white">Settings</Text>
      </View>

      <View className="mt-4">
        <SettingsRow
          icon="notifications-outline"
          label="Notifications"
          toggle={{ value: notificationsEnabled, onValueChange: setNotificationsEnabled }}
        />
        <SettingsRow
          icon="locate-outline"
          label="Units"
          subtitle={UNITS_LABEL[units]}
          onPress={() => router.push("/settings-units")}
        />
        <SettingsRow
          icon="moon-outline"
          label="App Theme"
          subtitle={THEME_LABEL[themeMode]}
          onPress={() => router.push("/settings-theme")}
        />
        <SettingsRow
          icon="cloud-upload-outline"
          label="Backup & Restore"
          accent
          onPress={() => router.push("/settings-backup")}
        />
        {developerModeEnabled ? (
          <>
            <SettingsRow
              icon="code-slash-outline"
              label="Developer mode"
              toggle={{ value: developerModeEnabled, onValueChange: setDeveloperModeEnabled }}
            />
            <SettingsRow
              icon="document-text-outline"
              label="Event Log"
              accent
              onPress={() => router.push("/settings-logs")}
            />
          </>
        ) : null}
        <SettingsRow
          icon="information-circle-outline"
          label="About"
          accent
          onPress={() => router.push("/settings-about")}
        />
      </View>
    </SafeAreaView>
  );
}
