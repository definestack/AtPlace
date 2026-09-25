import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export type Units = "km" | "mi";

const UNITS_KEY = "atplace.units";
const NOTIFICATIONS_ENABLED_KEY = "atplace.notificationsEnabled";
const DEVELOPER_MODE_KEY = "atplace.developerModeEnabled";
const PLACES_TIP_DISMISSED_KEY = "atplace.placesTipDismissed";
const REMINDER_TIP_DISMISSED_KEY = "atplace.reminderTipDismissed";

type SettingsState = {
  units: Units;
  notificationsEnabled: boolean;
  developerModeEnabled: boolean;
  /** Whether the Places-screen contextual tip (issue #42) has been dismissed. */
  placesTipDismissed: boolean;
  /** Whether the Add Reminder contextual tip (issue #42) has been dismissed. */
  reminderTipDismissed: boolean;
  hydrated: boolean;
  setUnits: (units: Units) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setDeveloperModeEnabled: (enabled: boolean) => void;
  setPlacesTipDismissed: (dismissed: boolean) => void;
  setReminderTipDismissed: (dismissed: boolean) => void;
  hydrate: () => Promise<void>;
};

/**
 * Persisted app preferences (Settings screen): distance units and whether
 * reminder notifications are delivered. Mirrors `themeStore`'s
 * AsyncStorage-backed, hydrate-on-launch pattern — see `src/app/_layout.tsx`.
 */
export const useSettingsStore = create<SettingsState>((set) => ({
  units: "km",
  notificationsEnabled: true,
  developerModeEnabled: false,
  placesTipDismissed: false,
  reminderTipDismissed: false,
  hydrated: false,
  setUnits: (units) => {
    set({ units });
    AsyncStorage.setItem(UNITS_KEY, units).catch(() => {});
  },
  setNotificationsEnabled: (enabled) => {
    set({ notificationsEnabled: enabled });
    AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, String(enabled)).catch(() => {});
  },
  setDeveloperModeEnabled: (enabled) => {
    set({ developerModeEnabled: enabled });
    AsyncStorage.setItem(DEVELOPER_MODE_KEY, String(enabled)).catch(() => {});
  },
  setPlacesTipDismissed: (dismissed) => {
    set({ placesTipDismissed: dismissed });
    AsyncStorage.setItem(PLACES_TIP_DISMISSED_KEY, String(dismissed)).catch(() => {});
  },
  setReminderTipDismissed: (dismissed) => {
    set({ reminderTipDismissed: dismissed });
    AsyncStorage.setItem(REMINDER_TIP_DISMISSED_KEY, String(dismissed)).catch(() => {});
  },
  hydrate: async () => {
    try {
      const [
        storedUnits,
        storedNotificationsEnabled,
        storedDeveloperModeEnabled,
        storedPlacesTipDismissed,
        storedReminderTipDismissed,
      ] = await Promise.all([
        AsyncStorage.getItem(UNITS_KEY),
        AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY),
        AsyncStorage.getItem(DEVELOPER_MODE_KEY),
        AsyncStorage.getItem(PLACES_TIP_DISMISSED_KEY),
        AsyncStorage.getItem(REMINDER_TIP_DISMISSED_KEY),
      ]);
      if (storedUnits === "km" || storedUnits === "mi") {
        set({ units: storedUnits });
      }
      if (storedNotificationsEnabled !== null) {
        set({ notificationsEnabled: storedNotificationsEnabled !== "false" });
      }
      if (storedDeveloperModeEnabled !== null) {
        set({ developerModeEnabled: storedDeveloperModeEnabled === "true" });
      }
      if (storedPlacesTipDismissed !== null) {
        set({ placesTipDismissed: storedPlacesTipDismissed === "true" });
      }
      if (storedReminderTipDismissed !== null) {
        set({ reminderTipDismissed: storedReminderTipDismissed === "true" });
      }
    } finally {
      set({ hydrated: true });
    }
  },
}));

/**
 * Reads the notifications-enabled preference directly from AsyncStorage,
 * bypassing the Zustand store. Used by the background geofence task
 * (`src/services/geofencing.ts`), which can run in a freshly relaunched JS
 * runtime where the store hasn't been hydrated. Defaults to enabled when
 * unset, matching the store's default.
 */
export async function getNotificationsEnabled(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
  return stored !== "false";
}
