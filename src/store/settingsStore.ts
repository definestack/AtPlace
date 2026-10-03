import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export type Units = "km" | "mi";

const UNITS_KEY = "atplace.units";
const NOTIFICATIONS_ENABLED_KEY = "atplace.notificationsEnabled";
const NOTIFICATION_SOUND_KEY = "atplace.notificationSound";
const NOTIFICATION_VIBRATION_KEY = "atplace.notificationVibration";
const DEVELOPER_MODE_KEY = "atplace.developerModeEnabled";
const LOGGING_ENABLED_KEY = "atplace.loggingEnabled";
const LOG_RETENTION_KEY = "atplace.logRetentionDays";
const PLACES_TIP_DISMISSED_KEY = "atplace.placesTipDismissed";
const REMINDER_TIP_DISMISSED_KEY = "atplace.reminderTipDismissed";

/** Bounds for the Log retention setting (issue #89). */
export const LOG_RETENTION_MIN_DAYS = 1;
export const LOG_RETENTION_MAX_DAYS = 15;
export const DEFAULT_LOG_RETENTION_DAYS = 5;

/** Rounds and clamps a candidate retention value into the allowed 1-15 day range, falling back to the default when it isn't a finite number. */
function clampLogRetentionDays(days: number): number {
  if (!Number.isFinite(days)) return DEFAULT_LOG_RETENTION_DAYS;
  return Math.min(LOG_RETENTION_MAX_DAYS, Math.max(LOG_RETENTION_MIN_DAYS, Math.round(days)));
}

function parseLogRetentionDays(stored: string | null): number {
  if (stored === null) return DEFAULT_LOG_RETENTION_DAYS;
  return clampLogRetentionDays(Number(stored));
}

type SettingsState = {
  units: Units;
  notificationsEnabled: boolean;
  /** Global default for reminder sound (issue #51); on by default. */
  notificationSound: boolean;
  /** Global default for reminder vibration (issue #51); on by default. */
  notificationVibration: boolean;
  developerModeEnabled: boolean;
  /**
   * Diagnostic logging (issue #68), visible only in Developer Mode. Default
   * `false` — see `isDiagnosticLoggingEnabled` for the effective on/off rule.
   */
  loggingEnabled: boolean;
  /** Days of Event Log history to keep before automatic cleanup (issue #89); default 5, range 1-15. */
  logRetentionDays: number;
  /** Whether the Places-screen contextual tip (issue #42) has been dismissed. */
  placesTipDismissed: boolean;
  /** Whether the Add Reminder contextual tip (issue #42) has been dismissed. */
  reminderTipDismissed: boolean;
  hydrated: boolean;
  setUnits: (units: Units) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setNotificationSound: (enabled: boolean) => void;
  setNotificationVibration: (enabled: boolean) => void;
  setDeveloperModeEnabled: (enabled: boolean) => void;
  setLoggingEnabled: (enabled: boolean) => void;
  setLogRetentionDays: (days: number) => void;
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
  notificationSound: true,
  notificationVibration: true,
  developerModeEnabled: false,
  loggingEnabled: false,
  logRetentionDays: DEFAULT_LOG_RETENTION_DAYS,
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
  setNotificationSound: (enabled) => {
    set({ notificationSound: enabled });
    AsyncStorage.setItem(NOTIFICATION_SOUND_KEY, String(enabled)).catch(() => {});
  },
  setNotificationVibration: (enabled) => {
    set({ notificationVibration: enabled });
    AsyncStorage.setItem(NOTIFICATION_VIBRATION_KEY, String(enabled)).catch(() => {});
  },
  setDeveloperModeEnabled: (enabled) => {
    set({ developerModeEnabled: enabled });
    AsyncStorage.setItem(DEVELOPER_MODE_KEY, String(enabled)).catch(() => {});
  },
  setLoggingEnabled: (enabled) => {
    set({ loggingEnabled: enabled });
    AsyncStorage.setItem(LOGGING_ENABLED_KEY, String(enabled)).catch(() => {});
  },
  setLogRetentionDays: (days) => {
    const clamped = clampLogRetentionDays(days);
    set({ logRetentionDays: clamped });
    AsyncStorage.setItem(LOG_RETENTION_KEY, String(clamped)).catch(() => {});
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
        storedNotificationSound,
        storedNotificationVibration,
        storedDeveloperModeEnabled,
        storedLoggingEnabled,
        storedLogRetentionDays,
        storedPlacesTipDismissed,
        storedReminderTipDismissed,
      ] = await Promise.all([
        AsyncStorage.getItem(UNITS_KEY),
        AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY),
        AsyncStorage.getItem(NOTIFICATION_SOUND_KEY),
        AsyncStorage.getItem(NOTIFICATION_VIBRATION_KEY),
        AsyncStorage.getItem(DEVELOPER_MODE_KEY),
        AsyncStorage.getItem(LOGGING_ENABLED_KEY),
        AsyncStorage.getItem(LOG_RETENTION_KEY),
        AsyncStorage.getItem(PLACES_TIP_DISMISSED_KEY),
        AsyncStorage.getItem(REMINDER_TIP_DISMISSED_KEY),
      ]);
      if (storedUnits === "km" || storedUnits === "mi") {
        set({ units: storedUnits });
      }
      if (storedNotificationsEnabled !== null) {
        set({ notificationsEnabled: storedNotificationsEnabled !== "false" });
      }
      if (storedNotificationSound !== null) {
        set({ notificationSound: storedNotificationSound !== "false" });
      }
      if (storedNotificationVibration !== null) {
        set({ notificationVibration: storedNotificationVibration !== "false" });
      }
      if (storedDeveloperModeEnabled !== null) {
        set({ developerModeEnabled: storedDeveloperModeEnabled === "true" });
      }
      if (storedLoggingEnabled !== null) {
        set({ loggingEnabled: storedLoggingEnabled === "true" });
      }
      set({ logRetentionDays: parseLogRetentionDays(storedLogRetentionDays) });
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

/**
 * Reads the global sound preference directly from AsyncStorage, bypassing
 * the Zustand store — same rationale as `getNotificationsEnabled` (used by
 * the background geofence task). Defaults to enabled when unset.
 */
export async function getNotificationSound(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(NOTIFICATION_SOUND_KEY);
  return stored !== "false";
}

/**
 * Reads the global vibration preference directly from AsyncStorage, bypassing
 * the Zustand store — same rationale as `getNotificationsEnabled` (used by
 * the background geofence task). Defaults to enabled when unset.
 */
export async function getNotificationVibration(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(NOTIFICATION_VIBRATION_KEY);
  return stored !== "false";
}

/**
 * Effective diagnostic-logging state (issue #68): logging only happens when
 * Developer Mode *and* the Logging toggle are both on. Turning Developer
 * Mode off stops logging immediately but keeps the stored Logging choice, so
 * it resumes if Developer Mode is re-enabled.
 *
 * When the store is hydrated (foreground), reads straight from memory so a
 * toggle change takes effect without a restart. Otherwise (e.g. the
 * background geofence task in a freshly relaunched JS runtime, before
 * `hydrate()` has run) falls back to AsyncStorage directly, same rationale as
 * `getNotificationsEnabled`.
 */
export async function isDiagnosticLoggingEnabled(): Promise<boolean> {
  const state = useSettingsStore.getState();
  if (state.hydrated) {
    return state.developerModeEnabled && state.loggingEnabled;
  }
  const [storedDeveloperModeEnabled, storedLoggingEnabled] = await Promise.all([
    AsyncStorage.getItem(DEVELOPER_MODE_KEY),
    AsyncStorage.getItem(LOGGING_ENABLED_KEY),
  ]);
  return storedDeveloperModeEnabled === "true" && storedLoggingEnabled === "true";
}

/**
 * Effective Log retention setting in days (issue #89): read from the live
 * store when hydrated (foreground), so a changed value takes effect without
 * a restart; otherwise falls back to AsyncStorage directly, same rationale as
 * `getNotificationsEnabled` (used by the background geofence task writing
 * logs before `hydrate()` has run). Defaults/clamps to 1-15, 5 by default.
 */
export async function getLogRetentionDays(): Promise<number> {
  const state = useSettingsStore.getState();
  if (state.hydrated) {
    return state.logRetentionDays;
  }
  const stored = await AsyncStorage.getItem(LOG_RETENTION_KEY);
  return parseLogRetentionDays(stored);
}
