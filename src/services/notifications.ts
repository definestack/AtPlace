import * as Notifications from "expo-notifications";

import type { ReminderTrigger } from "@/types/reminder";

/**
 * Show geofence-triggered notifications as a heads-up alert with sound even
 * while the app is in the foreground — otherwise arrivals while the app is
 * open would fire silently. Registered once at module load (issue #10).
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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
 */
export async function presentReminderNotification(
  placeName: string,
  reminderTitle: string,
  trigger: ReminderTrigger,
): Promise<void> {
  const title = trigger === "arrive" ? `You're at ${placeName}` : `Leaving ${placeName}`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: reminderTitle,
    },
    trigger: null,
  });
}
