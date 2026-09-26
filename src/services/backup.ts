import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { deleteAllNotifications } from "@/db/notificationsRepository";
import { deleteAllPlaces, getAllPlaces, insertPlace } from "@/db/placesRepository";
import { deleteAllReminders, getAllReminders, insertReminder } from "@/db/remindersRepository";
import { useNotificationsStore } from "@/store/notificationsStore";
import { usePlacesStore } from "@/store/placesStore";
import { useRemindersStore } from "@/store/remindersStore";
import { useSettingsStore, type Units } from "@/store/settingsStore";
import { useThemeStore, type ThemeMode } from "@/store/themeStore";
import type { NewPlace, Place } from "@/types/place";
import type { NewReminder, Reminder } from "@/types/reminder";

const BACKUP_FILE_NAME = "atplace-backup.json";
const BACKUP_VERSION = 1;

type BackupSettings = {
  themeMode: ThemeMode;
  units: Units;
  notificationsEnabled: boolean;
  notificationSound: boolean;
  notificationVibration: boolean;
};

type BackupPayload = {
  version: number;
  exportedAt: string;
  places: Place[];
  reminders: Reminder[];
  settings: BackupSettings;
};

/** Thrown by `importData` when the picked file isn't a recognizable At Place backup. */
export class BackupImportError extends Error {}

/**
 * Gathers all saved places, reminders, and app preferences into a single JSON
 * file (cache directory) and opens the system share sheet so the user can
 * save it wherever they like (Drive, email, local storage, ...).
 */
export async function exportData(): Promise<void> {
  const [places, reminders] = await Promise.all([getAllPlaces(), getAllReminders()]);
  const { mode: themeMode } = useThemeStore.getState();
  const { units, notificationsEnabled, notificationSound, notificationVibration } =
    useSettingsStore.getState();

  const payload: BackupPayload = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    places,
    reminders,
    settings: { themeMode, units, notificationsEnabled, notificationSound, notificationVibration },
  };

  const file = new File(Paths.cache, BACKUP_FILE_NAME);
  file.create({ overwrite: true });
  file.write(JSON.stringify(payload, null, 2));

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing isn't available on this device.");
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/json",
    dialogTitle: "Export At Place backup",
  });
}

function isValidBackupPayload(value: unknown): value is BackupPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<BackupPayload>;
  return Array.isArray(payload.places) && Array.isArray(payload.reminders);
}

/**
 * Opens the system file picker, then **replaces** all local places and
 * reminders (and restores preferences) from the picked backup file. Returns
 * `false` if the user cancelled the picker (a no-op, not an error) and
 * `true` on a successful restore. Callers are expected to confirm the
 * destructive replace with the user before calling this.
 */
export async function importData(): Promise<boolean> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/json",
    copyToCacheDirectory: true,
  });
  if (result.canceled) return false;

  let payload: unknown;
  try {
    const raw = await new File(result.assets[0].uri).text();
    payload = JSON.parse(raw);
  } catch {
    throw new BackupImportError("This file isn't a valid At Place backup.");
  }

  if (!isValidBackupPayload(payload)) {
    throw new BackupImportError("This file isn't a valid At Place backup.");
  }

  // Reminders reference places via a foreign key, so clear/insert in
  // dependency order: reminders out first, places in first. Notifications
  // (issue #40) are transient device history, not part of the backup
  // payload — clear them too so the inbox doesn't show stale entries
  // pointing at data that's about to be replaced.
  await deleteAllReminders();
  await deleteAllPlaces();
  await deleteAllNotifications();

  for (const place of payload.places) {
    const newPlace: NewPlace = {
      id: place.id,
      name: place.name,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      icon: place.icon,
      color: place.color,
      radius: place.radius,
    };
    await insertPlace(newPlace);
  }

  for (const reminder of payload.reminders) {
    const newReminder: NewReminder = {
      id: reminder.id,
      placeId: reminder.placeId,
      title: reminder.title,
      trigger: reminder.trigger,
      enabled: reminder.enabled,
      sound: reminder.sound ?? "default",
      vibration: reminder.vibration ?? "default",
      repeat: reminder.repeat ?? "once",
    };
    await insertReminder(newReminder);
  }

  const settings = payload.settings;
  if (settings) {
    if (settings.themeMode) useThemeStore.getState().setMode(settings.themeMode);
    if (settings.units) useSettingsStore.getState().setUnits(settings.units);
    if (typeof settings.notificationsEnabled === "boolean") {
      useSettingsStore.getState().setNotificationsEnabled(settings.notificationsEnabled);
    }
    if (typeof settings.notificationSound === "boolean") {
      useSettingsStore.getState().setNotificationSound(settings.notificationSound);
    }
    if (typeof settings.notificationVibration === "boolean") {
      useSettingsStore.getState().setNotificationVibration(settings.notificationVibration);
    }
  }

  // Re-hydrate in-memory stores from the database so screens reflect the
  // restored data immediately, without requiring an app restart.
  await Promise.all([
    usePlacesStore.getState().hydrate(),
    useRemindersStore.getState().hydrate(),
    useNotificationsStore.getState().hydrate(),
  ]);

  return true;
}
