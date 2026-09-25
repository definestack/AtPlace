import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { useEffect } from "react";
import { AppState } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

// The background geofence task itself is registered from `index.js` (issue
// #37), not here, so the OS can find it on a headless background relaunch —
// this route layout only runs `requestGeofencingPermissions`/`syncGeofences`.
import { requestGeofencingPermissions, syncGeofences } from "@/services/geofencing";
import { logException, logInfo } from "@/services/logger";
import { useNotificationsStore } from "@/store/notificationsStore";
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
  const hydrateNotifications = useNotificationsStore((state) => state.hydrate);
  const reminders = useRemindersStore((state) => state.reminders);
  const remindersHydrated = useRemindersStore((state) => state.hydrated);

  useEffect(() => {
    hydrate();
    hydratePlaces();
    hydrateReminders();
    hydrateSettings();
    hydrateNotifications();
  }, [hydrate, hydratePlaces, hydrateReminders, hydrateSettings, hydrateNotifications]);

  // The geofence task can deliver notifications while the app is
  // backgrounded/closed (issue #40); re-hydrate the notifications store
  // whenever the app returns to the foreground so the list and footer
  // badge reflect anything written in the background.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") hydrateNotifications();
    });
    return () => subscription.remove();
  }, [hydrateNotifications]);

  useEffect(() => {
    setColorScheme(mode);
  }, [mode, setColorScheme]);

  // Request geofencing/notification permissions once on launch. Denials are
  // swallowed here — `syncGeofences` below is skipped in that case, but the
  // rest of the app (manual reminders list) still works.
  useEffect(() => {
    requestGeofencingPermissions().catch((error) => {
      logException("Geofencing permissions not granted", error);
    });
  }, []);

  // Keep the OS geofence regions in sync with enabled reminders — re-synced
  // whenever the reminders list changes (added/removed/toggled) so newly
  // (in)active places are (un)watched. No-ops gracefully if permissions
  // were never granted (`startGeofencingAsync` rejects; caught below).
  useEffect(() => {
    if (!remindersHydrated) return;

    syncGeofences().catch((error) => {
      logInfo("Geofence sync skipped", error instanceof Error ? error.message : String(error));
    });
  }, [remindersHydrated, reminders]);

  return (
    // Required by `react-native-gesture-handler` for the Notifications
    // screen's swipe-to-reveal row actions (issue #40) to work anywhere in
    // the tree.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
