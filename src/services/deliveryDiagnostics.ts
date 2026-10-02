import type * as Notifications from "expo-notifications";

import { describeAppState } from "@/services/appLifecycle";
import { logException, logNotification, logVibration } from "@/services/logger";
import {
  channelFor,
  checkChannelVibration,
  getDeviceAlertState,
  getPresentedNotifications,
  getScheduledNotificationIds,
} from "@/services/notifications";
import { formatIsoTimestamp, formatLogDetail, joinLogDetail } from "@/utils/logFormat";

/**
 * Delivery diagnostics: whether Android actually showed a reminder
 * notification and vibrated for it, and if not, why.
 *
 * The app can only observe this while JS is running. When the app is open,
 * `logPresentedWhileOpen` records it as it happens. When the app is closed,
 * Android shows the scheduled notification natively with no JS running, so
 * `diagnoseDelivery` works it out afterwards, the next time JS runs: the
 * notification tray holds the exact time Android posted it, and a
 * notification still on the schedule list means Android hasn't fired its
 * alarm yet. The vibration motor itself can't be observed, so "vibration
 * triggered" means Android posted the notification with every setting the app
 * can read (channel, permission, Do Not Disturb) allowing vibration.
 */

/** The resolved sound/vibration choice a notification was scheduled with. */
export type AlertPrefs = { sound: boolean; vibration: boolean };

/** A posted notification later than this past its scheduled time means Android held the alarm back. */
const LATE_THRESHOLD_MS = 60_000;

const RINGER_NOTE =
  "Ringer set to Silent, or Android 15+ notification cooldown, can still mute it — apps can't read either";

type VibrationVerdict = { triggered: true } | { triggered: false; reason: string } | { unsupported: true };

/** Works out whether Android would vibrate for a notification with these prefs, from device state right now. */
async function judgeVibration(prefs: AlertPrefs): Promise<VibrationVerdict> {
  if (!prefs.vibration) {
    return { triggered: false, reason: "Vibration is off for this reminder (its own setting or the global default)" };
  }
  const [device, channel] = await Promise.all([
    getDeviceAlertState(),
    checkChannelVibration(channelFor(prefs.sound, prefs.vibration)),
  ]);
  if (!device.permissionGranted) {
    return { triggered: false, reason: "Notification permission is not granted" };
  }
  if (device.dndReason) return { triggered: false, reason: device.dndReason };
  if (!channel.supported) return { unsupported: true };
  if (!channel.willVibrate) return { triggered: false, reason: channel.reason };
  return { triggered: true };
}

async function logVibrationVerdict(
  verdict: VibrationVerdict,
  title: string,
  detail: Record<string, string | undefined>,
  checkedWhen: string,
): Promise<void> {
  if ("unsupported" in verdict) return;
  if (verdict.triggered) {
    await logVibration(
      `Vibration triggered by Android for "${title}"`,
      formatLogDetail({ ...detail, Checked: checkedWhen, Note: RINGER_NOTE }),
    );
  } else {
    await logVibration(
      `Vibration not triggered for "${title}"`,
      formatLogDetail({ ...detail, Checked: checkedWhen, Reason: verdict.reason }),
    );
  }
}

/** Reads the prefs stamped into a reminder notification's `data` by `presentReminderNotification`. */
function prefsFromData(data: Record<string, unknown> | undefined): AlertPrefs | null {
  if (!data || typeof data.channelId !== "string") return null;
  return { sound: data.sound !== false, vibration: data.vibration === true };
}

/**
 * Logs a reminder notification the moment Android shows it while the app is
 * open (`addNotificationReceivedListener` only fires in the foreground).
 * Never throws.
 */
export async function logPresentedWhileOpen(notification: Notifications.Notification): Promise<void> {
  try {
    const { content, identifier } = notification.request;
    const prefs = prefsFromData(content.data);
    if (!prefs) return;
    const title = content.body ?? content.title ?? identifier;
    const detail = {
      Notification: content.title ?? undefined,
      "Notification ID": identifier,
      "Shown at": formatIsoTimestamp(notification.date),
      "App state": describeAppState(),
    };
    await logNotification(`Android showed "${title}" (app open)`, formatLogDetail(detail));
    await logVibrationVerdict(await judgeVibration(prefs), title, detail, "as it was shown");
  } catch (err) {
    await logException("Failed to log presented notification", err);
  }
}

const loggedResponses = new Set<string>();

/** Logs a tap on a reminder notification, once per notification. Never throws. */
export async function logNotificationTapped(response: Notifications.NotificationResponse): Promise<void> {
  const { request, date } = response.notification;
  const key = `${request.identifier}:${date}`;
  if (loggedResponses.has(key)) return;
  loggedResponses.add(key);
  await logNotification(
    `Notification tapped: "${request.content.body ?? request.content.title ?? request.identifier}"`,
    formatLogDetail({
      "Notification ID": request.identifier,
      "Shown at": formatIsoTimestamp(date),
      "Tapped at": formatIsoTimestamp(Date.now()),
      "App state": describeAppState(),
    }),
  );
}

/** Tray and schedule contents, read once per catch-up pass rather than once per notification. */
export type DeliverySnapshot = {
  presented: Map<string, number>;
  scheduled: Set<string>;
};

/** Returns `null` if the OS couldn't be queried — diagnostics are then skipped, never delivery. */
export async function loadDeliverySnapshot(): Promise<DeliverySnapshot | null> {
  try {
    const [presented, scheduled] = await Promise.all([getPresentedNotifications(), getScheduledNotificationIds()]);
    return {
      presented: new Map(presented.map((n) => [n.id, n.postedAt])),
      scheduled: new Set(scheduled),
    };
  } catch (err) {
    await logException("Failed to read notification tray for delivery diagnostics", err);
    return null;
  }
}

export type DeliveryToDiagnose = {
  notificationId: string;
  title: string;
  fireAt: number;
  prefs: AlertPrefs | undefined;
  regionDetail: Record<string, string>;
};

/**
 * Works out, after the fact, whether Android showed a delayed reminder
 * notification and vibrated for it, and logs the result with a reason when
 * it didn't. Never throws.
 */
export async function diagnoseDelivery(delivery: DeliveryToDiagnose, snapshot: DeliverySnapshot): Promise<void> {
  try {
    const { notificationId, title, fireAt, prefs, regionDetail } = delivery;
    const now = Date.now();
    const base = {
      ...regionDetail,
      Reminder: title,
      "Notification ID": notificationId,
      "Scheduled for": formatIsoTimestamp(fireAt),
      "App state now": describeAppState(),
    };

    const postedAt = snapshot.presented.get(notificationId);
    if (postedAt !== undefined) {
      const lateMs = postedAt - fireAt;
      await logNotification(
        `Android showed "${title}"`,
        formatLogDetail({
          ...base,
          "Shown at": formatIsoTimestamp(postedAt),
          "Shown after": `${Math.round(lateMs / 1000)}s past scheduled time`,
          Note:
            lateMs > LATE_THRESHOLD_MS
              ? "Android held the alarm back — likely Doze/battery saving, or Alarms & reminders permission not granted"
              : undefined,
        }),
      );
      if (prefs) {
        await logVibrationVerdict(
          await judgeVibration(prefs),
          title,
          { ...base, "Shown at": formatIsoTimestamp(postedAt) },
          "when the app next ran (not at the moment it was shown)",
        );
      }
      return;
    }

    if (snapshot.scheduled.has(notificationId)) {
      const reason = `Its alarm is still waiting ${Math.round((now - fireAt) / 1000)}s past the scheduled time — Android deferred it (Doze/battery saving, or Alarms & reminders permission not granted)`;
      await logNotification(`Android has not shown "${title}" yet`, formatLogDetail({ ...base, Reason: reason }));
      await logVibration(
        `Vibration not triggered for "${title}"`,
        formatLogDetail({ ...base, Reason: "The notification hasn't been shown yet" }),
      );
      return;
    }

    // Fired (no longer scheduled) but not in the tray: dismissed/tapped, or
    // Android dropped it. Blockers visible now are the most likely reason.
    const verdict = prefs ? await judgeVibration(prefs) : null;
    const device = await getDeviceAlertState();
    const blocker = !device.permissionGranted
      ? "Notification permission is not granted, so Android likely never showed it"
      : device.dndReason;
    await logNotification(
      `"${title}" fired but is no longer in the notification tray`,
      joinLogDetail(
        formatLogDetail(base),
        formatLogDetail({
          Reason: blocker ?? "Android fired it; it was then dismissed or tapped before the app could check, so the exact time it was shown is unknown",
        }),
      ),
    );
    if (verdict && !("unsupported" in verdict)) {
      if (verdict.triggered) {
        await logVibration(
          `Vibration likely triggered for "${title}"`,
          formatLogDetail({
            ...base,
            Checked: "when the app next ran",
            Note: `Channel, permission and Do Not Disturb all allow vibration. ${RINGER_NOTE}`,
          }),
        );
      } else {
        await logVibration(
          `Vibration not triggered for "${title}"`,
          formatLogDetail({ ...base, Checked: "when the app next ran", Reason: verdict.reason }),
        );
      }
    }
  } catch (err) {
    await logException("Failed to diagnose notification delivery", err, { Reminder: delivery.title });
  }
}
