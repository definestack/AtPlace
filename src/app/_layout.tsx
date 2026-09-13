import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Importing this module also registers the background geofence task
// (`TaskManager.defineTask` runs at module scope) so expo-task-manager can
// find it even when the OS relaunches the JS runtime in the background (issue #10).
import { requestGeofencingPermissions, syncGeofences } from "@/services/geofencing";
import { usePlacesStore } from "@/store/placesStore";
import { useRemindersStore } from "@/store/remindersStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useThemeStore } from "@/store/themeStore";

export default function RootLayout() {
  const { setColorScheme, colorScheme } = useColorScheme();
  const mode = useThemeStore((state) => state.mode);
  const hydrate = useThemeStore((state) => state.hydrate);
  const hydratePlaces = usePlacesStore((state) => state.hydrate);
  const hydrateReminders = useRemindersStore((state) => state.hydrate);
  const hydrateSettings = useSettingsStore((state) => state.hydrate);
  const reminders = useRemindersStore((state) => state.reminders);
  const remindersHydrated = useRemindersStore((state) => state.hydrated);

  useEffect(() => {
    hydrate();
    hydratePlaces();
    hydrateReminders();
    hydrateSettings();
  }, [hydrate, hydratePlaces, hydrateReminders, hydrateSettings]);

  useEffect(() => {
    setColorScheme(mode);
  }, [mode, setColorScheme]);

  // Request geofencing/notification permissions once on launch. Denials are
  // swallowed here — `syncGeofences` below is skipped in that case, but the
  // rest of the app (manual reminders list) still works.
  useEffect(() => {
    requestGeofencingPermissions().catch((error) => {
      console.warn("Geofencing permissions not granted:", error);
    });
  }, []);

  // Keep the OS geofence regions in sync with enabled reminders — re-synced
  // whenever the reminders list changes (added/removed/toggled) so newly
  // (in)active places are (un)watched. No-ops gracefully if permissions
  // were never granted (`startGeofencingAsync` rejects; caught below).
  useEffect(() => {
    if (!remindersHydrated) return;

    syncGeofences().catch((error) => {
      console.warn("Geofence sync skipped:", error);
    });
  }, [remindersHydrated, reminders]);

  return (
    <SafeAreaProvider>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
