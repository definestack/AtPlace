import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";

import type { ReminderTrigger } from "@/types/reminder";

/**
 * Show geofence-triggered notifications as a heads-up alert even while the
 * app is in the foreground — otherwise arrivals while the app is open would
 * fire silently (issue #10). Whether sound plays is read from the
 * notification's own `data.sound` flag (set in `presentReminderNotification`)
 * so foreground delivery honors the same resolved sound setting as
 * background delivery (issue #51); defaults to `true` for notifications
 * without the flag.
 *
 * expo-notifications' Android builder also gates *vibration* on
 * `shouldPlaySound` (`ExpoNotificationBuilder.shouldVibrate`), so a
 * vibration-only reminder must still return `true` here or it is posted
 * fully silent. The channel (`channelFor`) still decides whether a sound
 * actually plays, so this never adds sound to a vibration-only reminder.
 */
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: data?.sound !== false || data?.vibration === true,
      shouldSetBadge: false,
    };
  },
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

/**
 * A short, noticeable vibration pattern for channels with vibration enabled.
 * Also set on the notification content itself: expo-notifications only
 * treats a notification as vibrating when its content carries a pattern, and
 * silences it outright (overriding the channel) when it neither vibrates nor
 * plays a sound — which is what made vibration-only reminders never vibrate.
 */
const VIBRATION_PATTERN = [0, 500, 250, 500];

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

  const channelId = channelFor(sound, vibration);

  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: reminderTitle,
      sound: sound ? "default" : false,
      ...(vibration ? { vibrate: VIBRATION_PATTERN } : {}),
      data: { sound, vibration, channelId },
    },
    trigger: triggerFor(channelId, delaySeconds),
  });
}

/** Immediate delivery when `delaySeconds` is 0, otherwise a time-interval trigger. */
function triggerFor(channelId: string, delaySeconds: number): Notifications.NotificationTriggerInput {
  return delaySeconds > 0
    ? {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: delaySeconds,
        channelId,
      }
    : { channelId };
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
  // Android only alerts (sound/vibration) at DEFAULT importance or above —
  // a channel the user switched to "Silent" in system settings drops to LOW
  // and posts without vibrating.
  if (channel.importance < Notifications.AndroidImportance.DEFAULT) {
    return {
      supported: true,
      willVibrate: false,
      channelId,
      reason: `This channel's importance (${describeImportance(channel.importance)}) is too low for Android to vibrate — it may be set to "Silent" in Android's notification settings`,
    };
  }
  return { supported: true, willVibrate: true, channelId };
}

function describeImportance(importance: Notifications.AndroidImportance): string {
  return Notifications.AndroidImportance[importance] ?? String(importance);
}

/**
 * Device-wide state that can stop Android from vibrating even when the
 * channel allows it (diagnostics only). `dndReason` is set when Do Not
 * Disturb is filtering notifications. Ringer mode (silent/vibrate) and
 * Android 15's notification cooldown aren't exposed to apps, so they can't
 * be reported here.
 */
export type DeviceAlertState = {
  permissionGranted: boolean;
  doNotDisturb: string;
  dndReason?: string;
};

/** Android `NotificationManager.INTERRUPTION_FILTER_*` values. */
function describeInterruptionFilter(filter: number | undefined): { label: string; blocks: boolean } {
  switch (filter) {
    case 1:
      return { label: "off", blocks: false };
    case 2:
      return { label: "on (priority only)", blocks: true };
    case 3:
      return { label: "on (total silence)", blocks: true };
    case 4:
      return { label: "on (alarms only)", blocks: true };
    default:
      return { label: "unknown", blocks: false };
  }
}

/** Reads notification permission and Do Not Disturb state right now. */
export async function getDeviceAlertState(): Promise<DeviceAlertState> {
  const status = await Notifications.getPermissionsAsync();
  const dnd = describeInterruptionFilter(status.android?.interruptionFilter);
  return {
    permissionGranted: status.granted,
    doNotDisturb: dnd.label,
    dndReason: dnd.blocks ? `Do Not Disturb is ${dnd.label}, which blocks this app's notifications` : undefined,
  };
}

/** A notification currently shown in the Android notification tray, with the time Android posted it. */
export type PresentedNotification = { id: string; postedAt: number };

/** Notifications currently in the tray (Android records when each one was actually posted). */
export async function getPresentedNotifications(): Promise<PresentedNotification[]> {
  const presented = await Notifications.getPresentedNotificationsAsync();
  return presented.map((n) => ({ id: n.request.identifier, postedAt: n.date }));
}

/** Ids of notifications still waiting for their alarm to fire. */
export async function getScheduledNotificationIds(): Promise<string[]> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.map((request) => request.identifier);
}

/**
 * Opens the system screen where the user grants "Alarms & reminders" (issue
 * #78): on Android 14+ (API 34+), apps no longer get `SCHEDULE_EXACT_ALARM`
 * automatically, so delayed arrive/leave notifications fall back to an
 * inexact alarm that Doze can hold back by several minutes unless the user
 * grants this manually. A no-op on earlier Android (where the manifest
 * permission in `app.config.js` is enough) and on iOS/web. Falls back to the
 * app's general settings page if the dedicated intent isn't handled (e.g. an
 * OEM variant without that screen), so the row always does something.
 */
export async function openExactAlarmSettings(): Promise<void> {
  if (Platform.OS !== "android" || Platform.Version < 31) return;

  try {
    await Linking.sendIntent("android.settings.REQUEST_SCHEDULE_EXACT_ALARM");
  } catch {
    await Linking.openSettings();
  }
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
 *
 * `delaySeconds` (default 0, i.e. immediate) lets the tester lock the screen
 * or leave the app before the notification arrives, to check background
 * delivery (issue #106).
 */
export async function presentTestNotification(
  sound: boolean,
  vibration: boolean,
  delaySeconds = 0,
): Promise<void> {
  const channelId = channelFor(sound, vibration);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Test Notification",
      body: "This is a test notification.",
      sound: sound ? "default" : false,
      ...(vibration ? { vibrate: VIBRATION_PATTERN } : {}),
      data: { sound, vibration, channelId },
    },
    trigger: triggerFor(channelId, delaySeconds),
  });
}

/** Delay choices offered by the Settings Test Notification action (issue #106). */
export const TEST_NOTIFICATION_DELAYS = [
  { label: "Raise immediately", seconds: 0 },
  { label: "Raise after 5 seconds", seconds: 5 },
  { label: "Raise after 10 seconds", seconds: 10 },
] as const;
