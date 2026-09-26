import * as Notifications from "expo-notifications";

import type { ReminderTrigger } from "@/types/reminder";

/**
 * Show geofence-triggered notifications as a heads-up alert even while the
 * app is in the foreground — otherwise arrivals while the app is open would
 * fire silently (issue #10). Whether sound plays is read from the
 * notification's own `data.sound` flag (set in `presentReminderNotification`)
 * so foreground delivery honors the same resolved sound setting as
 * background delivery (issue #51); defaults to `true` for notifications
 * without the flag.
 */
Notifications.setNotificationHandler({
  handleNotification: async (notification) => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: notification.request.content.data?.sound !== false,
    shouldSetBadge: false,
  }),
});

/**
 * Android notification channels for reminder notifications (issue #37,
 * extended in #51). Android 8+ ties sound/vibration to the channel and
 * channels are immutable once created, so each combination of
 * sound-on/off x vibration-on/off gets its own channel, selected at delivery
 * time via `channelFor`. iOS ignores channels entirely.
 */
export const REMINDER_CHANNEL_SOUND_VIBRATION = "atplace-reminders";
export const REMINDER_CHANNEL_SOUND_ONLY = "atplace-reminders-sound";
export const REMINDER_CHANNEL_VIBRATION_ONLY = "atplace-reminders-vibration";
export const REMINDER_CHANNEL_SILENT = "atplace-reminders-silent";

/** A short, noticeable vibration pattern for channels with vibration enabled. */
const VIBRATION_PATTERN = [0, 250, 250, 250];

/** Picks the channel matching a resolved sound/vibration combination. */
export function channelFor(sound: boolean, vibration: boolean): string {
  if (sound && vibration) return REMINDER_CHANNEL_SOUND_VIBRATION;
  if (sound) return REMINDER_CHANNEL_SOUND_ONLY;
  if (vibration) return REMINDER_CHANNEL_VIBRATION_ONLY;
  return REMINDER_CHANNEL_SILENT;
}

/**
 * Creates (or updates) all four reminder notification channels. Safe to call
 * on every launch — `setNotificationChannelAsync` upserts by id — and is a
 * no-op on platforms without channel support (iOS/web).
 */
export async function ensureNotificationChannels(): Promise<void> {
  const variants: { id: string; sound: boolean; vibration: boolean }[] = [
    { id: REMINDER_CHANNEL_SOUND_VIBRATION, sound: true, vibration: true },
    { id: REMINDER_CHANNEL_SOUND_ONLY, sound: true, vibration: false },
    { id: REMINDER_CHANNEL_VIBRATION_ONLY, sound: false, vibration: true },
    { id: REMINDER_CHANNEL_SILENT, sound: false, vibration: false },
  ];

  await Promise.all(
    variants.map(({ id, sound, vibration }) =>
      Notifications.setNotificationChannelAsync(id, {
        name: "Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        sound: sound ? "default" : null,
        enableVibrate: vibration,
        vibrationPattern: vibration ? VIBRATION_PATTERN : null,
      }),
    ),
  );
}

/**
 * Requests permission to show local notifications. Returns whether
 * permission is granted (existing or newly granted) so callers can decide
 * whether to proceed with geofencing setup.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * Presents a local notification for a reminder that just fired, in the
 * format "You're at [Place]. [Reminder text]" (arrive) or a "leaving"
 * variant for the `leave` trigger. Dismissal is handled natively by the OS.
 *
 * `sound`/`vibration` are the already-resolved booleans for this reminder
 * (global default combined with any per-reminder override — see
 * `utils/notificationPrefs.ts`): they select the Android channel and the iOS
 * sound, and are also stamped into `data` so the foreground handler above
 * can honor the same sound setting.
 */
export async function presentReminderNotification(
  placeName: string,
  reminderTitle: string,
  trigger: ReminderTrigger,
  sound: boolean,
  vibration: boolean,
): Promise<void> {
  const title = trigger === "arrive" ? `You're at ${placeName}` : `Leaving ${placeName}`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: reminderTitle,
      sound: sound ? "default" : false,
      data: { sound },
    },
    trigger: { channelId: channelFor(sound, vibration) },
  });
}

/**
 * Presents a clearly-labeled test notification via the same channel-based
 * delivery mechanism used for real reminders (issue #57), so a developer can
 * verify sound/vibration behavior without waiting for a geofence arrival.
 *
 * `sound`/`vibration` are the already-resolved global preference booleans
 * (see `getNotificationSound`/`getNotificationVibration` in `settingsStore`)
 * so the test reflects the user's current settings.
 */
export async function presentTestNotification(sound: boolean, vibration: boolean): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Test Notification",
      body: "This is a test notification.",
      sound: sound ? "default" : false,
      data: { sound },
    },
    trigger: { channelId: channelFor(sound, vibration) },
  });
}
