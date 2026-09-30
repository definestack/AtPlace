import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

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
export const REMINDER_CHANNEL_SOUND_VIBRATION = "atplace-reminders-sound-vibration";
export const REMINDER_CHANNEL_SOUND_ONLY = "atplace-reminders-sound";
export const REMINDER_CHANNEL_VIBRATION_ONLY = "atplace-reminders-vibration";
export const REMINDER_CHANNEL_SILENT = "atplace-reminders-silent";

/**
 * Channel created in #37 with default settings (no vibration). Android
 * ignores sound/vibration changes to an existing channel, so upgraded installs
 * kept a non-vibrating channel; it is deleted and replaced by
 * `REMINDER_CHANNEL_SOUND_VIBRATION`.
 */
const LEGACY_REMINDER_CHANNEL = "atplace-reminders";

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
 * Creates all four reminder notification channels and removes the legacy
 * one. Safe to call on every launch, and a no-op on platforms without channel
 * support (iOS/web). Android only applies sound/vibration when a channel is
 * first created, so changing those settings requires a new channel id.
 */
export async function ensureNotificationChannels(): Promise<void> {
  const variants: { id: string; sound: boolean; vibration: boolean }[] = [
    { id: REMINDER_CHANNEL_SOUND_VIBRATION, sound: true, vibration: true },
    { id: REMINDER_CHANNEL_SOUND_ONLY, sound: true, vibration: false },
    { id: REMINDER_CHANNEL_VIBRATION_ONLY, sound: false, vibration: true },
    { id: REMINDER_CHANNEL_SILENT, sound: false, vibration: false },
  ];

  await Notifications.deleteNotificationChannelAsync(LEGACY_REMINDER_CHANNEL);

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

/** Reads the current notification permission without prompting — used for vibration diagnostics (issue #70). */
export async function hasNotificationPermission(): Promise<boolean> {
  const status = await Notifications.getPermissionsAsync();
  return status.granted;
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
 *
 * `delaySeconds` (default 0, i.e. immediate) holds the notification back so
 * the geofence task can cancel it if the transition turns out to be a
 * drive-through rather than a genuine arrival/departure (see
 * `services/geofencing.ts`'s pending-delivery handling). Returns the
 * scheduled notification's id so the caller can cancel it later via
 * `cancelScheduledNotifications`.
 */
export async function presentReminderNotification(
  placeName: string,
  reminderTitle: string,
  trigger: ReminderTrigger,
  sound: boolean,
  vibration: boolean,
  delaySeconds = 0,
): Promise<string> {
  const title = trigger === "arrive" ? `You're at ${placeName}` : `Leaving ${placeName}`;

  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: reminderTitle,
      sound: sound ? "default" : false,
      data: { sound },
    },
    trigger:
      delaySeconds > 0
        ? {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: delaySeconds,
            channelId: channelFor(sound, vibration),
          }
        : { channelId: channelFor(sound, vibration) },
  });
}

/**
 * Whether Android will actually vibrate for a channel (issue #70), keeping
 * `AndroidImportance` knowledge in this module rather than leaking it to
 * callers. `supported: false` on platforms without channel support
 * (iOS/web), where this can't be determined and vibration logging should
 * say nothing rather than guess.
 */
export type VibrationCheck =
  | { supported: false }
  | { supported: true; willVibrate: true; channelId: string }
  | { supported: true; willVibrate: false; channelId: string; reason: string };

/**
 * Reads back a notification channel's real settings and reports whether
 * Android will vibrate for it — e.g. the user may have disabled vibration or
 * lowered importance for this channel in Android's own notification
 * settings, which the app can't detect any other way since channel settings
 * are immutable once created (see `ensureNotificationChannels`).
 */
export async function checkChannelVibration(channelId: string): Promise<VibrationCheck> {
  if (Platform.OS !== "android") return { supported: false };

  const channel = await Notifications.getNotificationChannelAsync(channelId);
  if (!channel) {
    return {
      supported: true,
      willVibrate: false,
      channelId,
      reason: "Notification channel does not exist",
    };
  }
  if (!channel.enableVibrate) {
    return {
      supported: true,
      willVibrate: false,
      channelId,
      reason: "Vibration is turned off for this channel in Android's notification settings",
    };
  }
  if (channel.importance <= Notifications.AndroidImportance.MIN) {
    return {
      supported: true,
      willVibrate: false,
      channelId,
      reason: "This channel's notification importance is too low for Android to vibrate",
    };
  }
  return { supported: true, willVibrate: true, channelId };
}

/**
 * Cancels previously scheduled notifications that haven't fired yet — used
 * when a pending delayed arrival/leave notification turns out to be a
 * drive-through (see `services/geofencing.ts`). Cancelling an id that has
 * already fired or doesn't exist is a silent no-op.
 */
export async function cancelScheduledNotifications(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
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
