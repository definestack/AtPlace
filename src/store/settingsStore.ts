import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export type Units = "km" | "mi";

const UNITS_KEY = "atplace.units";
const NOTIFICATIONS_ENABLED_KEY = "atplace.notificationsEnabled";

type SettingsState = {
  units: Units;
  notificationsEnabled: boolean;
  hydrated: boolean;
  setUnits: (units: Units) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
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
  hydrated: false,
  setUnits: (units) => {
    set({ units });
    AsyncStorage.setItem(UNITS_KEY, units).catch(() => {});
  },
  setNotificationsEnabled: (enabled) => {
    set({ notificationsEnabled: enabled });
    AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, String(enabled)).catch(() => {});
  },
  hydrate: async () => {
    try {
      const [storedUnits, storedNotificationsEnabled] = await Promise.all([
        AsyncStorage.getItem(UNITS_KEY),
        AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY),
      ]);
      if (storedUnits === "km" || storedUnits === "mi") {
        set({ units: storedUnits });
      }
      if (storedNotificationsEnabled !== null) {
        set({ notificationsEnabled: storedNotificationsEnabled !== "false" });
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
