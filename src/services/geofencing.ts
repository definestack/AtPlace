import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

import { insertNotification } from "@/db/notificationsRepository";
import { getPlaceName } from "@/db/placesRepository";
import {
  getActiveRemindersForTrigger,
  getGeofenceRegions,
  setReminderEnabled,
  type ActiveReminderSummary,
  type GeofenceRegion,
} from "@/db/remindersRepository";
import { logException, logGeofence, logNotification, logVibration } from "@/services/logger";
import { LocationPermissionDeniedError } from "@/services/location";
import {
  cancelScheduledNotifications,
  channelFor,
  checkChannelVibration,
  ensureNotificationChannels,
  hasNotificationPermission,
  presentReminderNotification,
  requestNotificationPermission,
} from "@/services/notifications";
import {
  getArrivalDelayMinutes,
  getLeaveDelayMinutes,
  getNotificationSound,
  getNotificationVibration,
  getNotificationsEnabled,
} from "@/store/settingsStore";
import type { ReminderTrigger } from "@/types/reminder";
import { distanceMeters } from "@/utils/geo";
import { formatLogDetail } from "@/utils/logFormat";
import { resolveOverride } from "@/utils/notificationPrefs";

/** Background task name — must match between `defineTask` and start/stopGeofencingAsync. */
export const GEOFENCE_TASK_NAME = "atplace-geofence-task";

/**
 * Signature of the last region set passed to `startGeofencingAsync`, so
 * `syncGeofences` can skip re-registering when nothing changed. Re-registering
 * unnecessarily (e.g. on every app launch) matters because Android's
 * Geofencing API fires an immediate ENTER/EXIT transition on registration
 * for regions the device is already inside/outside of — without this check
 * that meant a spurious "You're at Home" notification every time the app
 * was opened while at a saved place.
 */
const LAST_SYNCED_REGIONS_KEY = "atplace.lastSyncedGeofenceRegions";

function regionsSignature(regions: GeofenceRegion[]): string {
  return JSON.stringify(
    [...regions]
      .sort((a, b) => a.placeId.localeCompare(b.placeId))
      .map((r) => [r.placeId, r.latitude, r.longitude, r.radius]),
  );
}

/**
 * Per-place "is the device currently inside this region?" snapshot, seeded
 * from the device's actual GPS position whenever `syncGeofences` (re)registers
 * (see below), plus the moment it was seeded. This is what lets the task
 * handler tell a genuine arrival/departure apart from the immediate
 * ENTER/EXIT transition Android fires for every region on registration
 * (issue #46) — that spurious event always matches the freshly-seeded
 * occupancy, so `shouldNotify` recognizes it as "no real change" and skips it.
 *
 * `enteredAt` additionally records *when* the last genuine ENTER for a place
 * happened, so the task handler can tell a drive-through from a genuine stay
 * when EXIT arrives (see `planTransition`). It's cleared on every genuine
 * EXIT and left empty by `seedOccupancy` for places already inside at
 * (re)registration — an unset entry means "treat as a confirmed stay" rather
 * than risk suppressing a real leave reminder.
 */
const OCCUPANCY_KEY = "atplace.geofenceOccupancy";

/** Backstop for a contradictory transition delivered shortly after registration. */
const SETTLE_MS = 30_000;

type OccupancyState = {
  registeredAt: number;
  occupancy: Record<string, boolean>;
  enteredAt: Record<string, number>;
};

async function getOccupancyState(): Promise<OccupancyState> {
  const raw = await AsyncStorage.getItem(OCCUPANCY_KEY);
  if (!raw) return { registeredAt: 0, occupancy: {}, enteredAt: {} };
  try {
    // `enteredAt` was added after `registeredAt`/`occupancy` — default it for
    // state persisted by an older build of the app.
    const parsed = JSON.parse(raw) as Partial<OccupancyState>;
    return {
      registeredAt: parsed.registeredAt ?? 0,
      occupancy: parsed.occupancy ?? {},
      enteredAt: parsed.enteredAt ?? {},
    };
  } catch {
    return { registeredAt: 0, occupancy: {}, enteredAt: {} };
  }
}

async function setOccupancyState(state: OccupancyState): Promise<void> {
  await AsyncStorage.setItem(OCCUPANCY_KEY, JSON.stringify(state));
}

/**
 * A reminder notification that's been scheduled with a delay (issue: driving
 * through a place shouldn't notify) but hasn't fired/been finalized yet, one
 * per place. `notificationIds` are the OS-scheduled notifications to cancel
 * if the transition turns out to be a drive-through; `reminders` is the
 * snapshot needed to write the inbox row(s) and disable one-time reminders
 * once `fireAt` elapses (see `finalizeDuePending`).
 */
type PendingDelivery = {
  trigger: ReminderTrigger;
  fireAt: number;
  notificationIds: string[];
  reminders: ActiveReminderSummary[];
};

type PendingState = Record<string, PendingDelivery>;

/** Keyed separately from `OCCUPANCY_KEY` so re-seeding occupancy never wipes pending deliveries. */
const PENDING_KEY = "atplace.geofencePending";

async function getPendingState(): Promise<PendingState> {
  const raw = await AsyncStorage.getItem(PENDING_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as PendingState;
  } catch {
    return {};
  }
}

async function setPendingState(state: PendingState): Promise<void> {
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(state));
}

/** Why `shouldNotify` suppressed a transition — surfaced in the Event Log (issue #70). */
export type SuppressReason = "alreadyInState" | "settling";

/**
 * Decides whether a geofence event represents a genuine transition (and so
 * should notify), given the last known occupancy for that place. Pure so the
 * decision is easy to reason about independent of AsyncStorage/TaskManager.
 */
export function shouldNotify(
  trigger: ReminderTrigger,
  placeId: string,
  state: OccupancyState,
  now: number,
): { notify: boolean; nextInside: boolean; reason?: SuppressReason } {
  const expectedInside = trigger === "arrive";
  const known = state.occupancy[placeId];

  // Already known to be in the state this event claims to move us to — not a
  // real change (this is the immediate post-registration transition, or a
  // duplicate delivery).
  if (known === expectedInside) {
    return { notify: false, nextInside: expectedInside, reason: "alreadyInState" };
  }

  // An apparent transition delivered shortly after (re)registration is still
  // treated as the initial trigger rather than a real move, in case Android
  // delivers it a little late. Occupancy is left as last known (falling back
  // to "not expected" if we never seeded it at all).
  if (now - state.registeredAt < SETTLE_MS) {
    return { notify: false, nextInside: known ?? !expectedInside, reason: "settling" };
  }

  return { notify: true, nextInside: expectedInside };
}

/** Human-readable text for a `shouldNotify` suppression, shown as the log row's `Reason`. */
function describeSuppressReason(reason: SuppressReason | undefined): string {
  switch (reason) {
    case "alreadyInState":
      return "Device was already inside/outside this place (duplicate or post-registration event)";
    case "settling":
      return `Within the ${SETTLE_MS / 1000}s settle window after geofences were (re)registered`;
    default:
      return "Unknown";
  }
}

/** What to do about a genuine transition, once `shouldNotify` has confirmed it's real. */
type TransitionDecision =
  | { action: "cancelOpposite" }
  | { action: "schedule"; delayMs: number }
  | { action: "suppressShortStay" };

/**
 * Decides how to handle a genuine ENTER/EXIT once `shouldNotify` has ruled
 * out a spurious post-registration event, so a drive-through doesn't notify
 * (the original motivation for this whole delay scheme). Pure, like
 * `shouldNotify`, so the drive-through/reversal rules are easy to reason
 * about independent of AsyncStorage/TaskManager:
 *
 * - ENTER while a LEAVE is still pending (not yet fired) means the device
 *   never really left — cancel the pending leave, nothing new to schedule.
 * - EXIT while an ARRIVE is still pending means this was a drive-through —
 *   cancel the pending arrival, nothing new to schedule (leave is suppressed
 *   too, since there was no confirmed arrival to leave from).
 * - EXIT with no pending arrival, but the confirmed stay (`now - enteredAt`)
 *   was shorter than the arrival delay, is the same drive-through case for a
 *   place with only `leave` reminders (no arrival was ever scheduled to
 *   cancel). `enteredAt` unset (place was already occupied when regions were
 *   last (re)registered) is treated as a confirmed stay, not a short one.
 * - Otherwise, schedule the notification with the appropriate delay.
 */
export function planTransition(
  trigger: ReminderTrigger,
  pending: PendingDelivery | undefined,
  enteredAt: number | undefined,
  now: number,
  arrivalDelayMs: number,
  leaveDelayMs: number,
): TransitionDecision {
  const pendingOpposite = trigger === "arrive" ? "leave" : "arrive";
  if (pending?.trigger === pendingOpposite && pending.fireAt > now) {
    return { action: "cancelOpposite" };
  }

  if (trigger === "arrive") {
    return { action: "schedule", delayMs: arrivalDelayMs };
  }

  if (enteredAt !== undefined && now - enteredAt < arrivalDelayMs) {
    return { action: "suppressShortStay" };
  }
  return { action: "schedule", delayMs: leaveDelayMs };
}

/**
 * Delivers the inbox row(s) and one-time-reminder disable for every pending
 * delayed notification whose `fireAt` has elapsed, then drops it from
 * pending state. The OS notification itself was already scheduled (with its
 * own delay) by `presentReminderNotification` — this just catches up the
 * app's own records (inbox, one-time reminder) to match, since nothing else
 * wakes the JS runtime purely because a scheduled notification's delay
 * elapsed. Called from the geofence task itself (so a place's own pending
 * delivery is finalized as part of handling its next transition) and from
 * `_layout.tsx` on launch/foreground (issue #40: so the inbox reflects a
 * delayed notification that fired while the app was closed).
 */
export async function finalizeDuePending(): Promise<void> {
  const now = Date.now();
  const pendingState = await getPendingState();
  const dueEntries = Object.entries(pendingState).filter(([, entry]) => entry.fireAt <= now);
  if (dueEntries.length === 0) return;

  let disabledOneTimeReminder = false;
  for (const [placeId, entry] of dueEntries) {
    for (const reminder of entry.reminders) {
      // Persist a notification-inbox row alongside the OS notification
      // (issue #40), so the in-app Notifications screen has a record of
      // deliveries that happened while the app was closed. A denormalized
      // snapshot of the reminder/place is stored so the row still renders
      // correctly even if the reminder or place is later edited/deleted.
      // Stamped with the notification's actual fire time, not now.
      await insertNotification(
        {
          reminderId: reminder.reminderId,
          placeId,
          reminderTitle: reminder.title,
          placeName: reminder.placeName,
          placeIcon: reminder.placeIcon,
          placeColor: reminder.placeColor,
          trigger: entry.trigger,
        },
        entry.fireAt,
      );
      const deliveryDetail = formatLogDetail({
        Reminder: reminder.title,
        Place: reminder.placeName,
        "Region ID": placeId,
      });
      await logNotification(`Presented "${reminder.title}"`, deliveryDetail);

      // One-time reminders (issue #53) go inactive after firing once — shown
      // as disabled rather than deleted, so notification history is kept.
      if (reminder.repeat === "once") {
        await setReminderEnabled(reminder.reminderId, false);
        await logGeofence("Disabled one-time reminder after firing", deliveryDetail);
        disabledOneTimeReminder = true;
      }
    }
    delete pendingState[placeId];
  }
  await setPendingState(pendingState);

  // A disabled one-time reminder may have been the last active reminder for
  // this place — re-sync so the OS stops monitoring it. Safe to call
  // unconditionally (no-ops when the region set is unchanged); the
  // `enabled = 1` filter above already stops the reminder from re-firing
  // even before this re-sync completes.
  if (disabledOneTimeReminder) {
    await syncGeofences();
  }
}

type GeofenceTaskData = {
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
};

/**
 * Logs a vibration request and, where it can be determined, whether it will
 * actually fire (issue #70). The app has no way to observe the vibration
 * motor itself, so this reports the resolved on/off decision and — when
 * it's on — the real state of the Android notification channel it's
 * delivered through (see `checkChannelVibration`); a device in silent/DND
 * mode can still suppress vibration even when everything checked here looks
 * fine, which the "handed to Android" row notes. Never throws — a logging
 * failure here must not affect the reminder notification that already
 * scheduled successfully.
 */
async function logVibrationOutcome(
  reminder: ActiveReminderSummary,
  regionDetail: { Place: string; "Region ID": string },
  vibration: boolean,
  sound: boolean,
  delaySeconds: number,
): Promise<void> {
  const settingSource = reminder.vibration === "default" ? "global default" : "this reminder's override";
  const baseDetail = {
    ...regionDetail,
    Reminder: reminder.title,
    Setting: `${vibration ? "on" : "off"} (${settingSource})`,
  };
  await logVibration(`Vibration requested for "${reminder.title}"`, formatLogDetail(baseDetail));

  if (!vibration) {
    await logVibration(
      "Vibration not triggered",
      formatLogDetail({
        ...baseDetail,
        Reason:
          reminder.vibration === "off"
            ? "Turned off by this reminder's Vibration setting"
            : "Turned off in Settings > Notifications (global default)",
      }),
    );
    return;
  }

  try {
    const [check, permissionGranted] = await Promise.all([
      checkChannelVibration(channelFor(sound, vibration)),
      hasNotificationPermission(),
    ]);

    if (!permissionGranted) {
      await logVibration(
        "Vibration not triggered",
        formatLogDetail({ ...baseDetail, Reason: "Notification permission is not granted" }),
      );
      return;
    }

    if (!check.supported) {
      // iOS/web: channel state can't be checked, so nothing more to say.
      return;
    }

    if (!check.willVibrate) {
      await logVibration(
        "Vibration not triggered",
        formatLogDetail({ ...baseDetail, Channel: check.channelId, Reason: check.reason }),
      );
      return;
    }

    await logVibration(
      "Vibration handed to Android",
      formatLogDetail({
        ...baseDetail,
        Channel: check.channelId,
        "Fires in": `${delaySeconds}s`,
        Note: "Device silent/DND mode may still suppress it",
      }),
    );
  } catch (err) {
    await logException("Failed to check vibration channel state", err, {
      ...regionDetail,
      Reminder: reminder.title,
    });
  }
}

/**
 * Registered at module scope (not inside a component) so the OS can relaunch
 * the JS runtime in the background and immediately find this task — per
 * `expo-task-manager`'s requirement that `defineTask` run in the global
 * scope. `region.identifier` is the place's id (see `syncGeofences`).
 */
TaskManager.defineTask<GeofenceTaskData>(GEOFENCE_TASK_NAME, async ({ data, error }) => {
  if (error) {
    await logException("Geofencing task error", error, {
      "Region ID": data?.region?.identifier,
    });
    return;
  }
  if (!data) return;

  const { eventType, region } = data;
  const placeId = region.identifier;
  if (!placeId) return;

  const trigger: ReminderTrigger =
    eventType === Location.GeofencingEventType.Enter ? "arrive" : "leave";

  // Resolved once per event so every log row below can name the place
  // instead of just its internal region id (issue #70). A lookup failure
  // (or a deleted place) must never block delivery — it only affects the
  // log's label.
  let placeName: string | null = null;
  try {
    placeName = await getPlaceName(placeId);
  } catch (err) {
    await logException("Failed to resolve place name for geofence event", err, {
      "Region ID": placeId,
    });
  }
  const regionDetail = { Place: placeName ?? "Unknown place (deleted?)", "Region ID": placeId };

  await logGeofence(`${trigger === "arrive" ? "Entered" : "Exited"} region`, formatLogDetail(regionDetail));

  try {
    // Catch up any earlier pending delivery whose delay already elapsed
    // before reasoning about this new transition (see `finalizeDuePending`).
    await finalizeDuePending();

    const now = Date.now();

    // Tell a genuine arrival/departure apart from the immediate ENTER/EXIT
    // Android fires for every region as soon as it's registered (issue #46).
    // Occupancy is updated regardless of what happens below so it never
    // drifts from reality.
    const occupancyState = await getOccupancyState();
    const { notify, nextInside, reason } = shouldNotify(trigger, placeId, occupancyState, now);
    const enteredAt = occupancyState.enteredAt[placeId];
    const nextEnteredAt = { ...occupancyState.enteredAt };
    if (notify) {
      // Genuine ENTER starts (or restarts) the confirmed-stay clock; genuine
      // EXIT clears it — the stay is over either way (drive-through or not).
      if (trigger === "arrive") {
        nextEnteredAt[placeId] = now;
      } else {
        delete nextEnteredAt[placeId];
      }
    }
    await setOccupancyState({
      ...occupancyState,
      occupancy: { ...occupancyState.occupancy, [placeId]: nextInside },
      enteredAt: nextEnteredAt,
    });
    if (!notify) {
      await logGeofence(
        "Suppressed — not a genuine transition",
        formatLogDetail({ ...regionDetail, Reason: describeSuppressReason(reason) }),
      );
      return;
    }

    // Settings screen "Notifications" toggle (issue #12): keep geofencing
    // itself running, but suppress the resulting notification when disabled.
    if (!(await getNotificationsEnabled())) {
      await logNotification(
        "Suppressed — notifications disabled in Settings",
        formatLogDetail({ ...regionDetail, Reason: "Notifications are turned off in Settings" }),
      );
      return;
    }

    const pendingState = await getPendingState();
    const [arrivalDelayMinutes, leaveDelayMinutes] = await Promise.all([
      getArrivalDelayMinutes(),
      getLeaveDelayMinutes(),
    ]);
    const decision = planTransition(
      trigger,
      pendingState[placeId],
      enteredAt,
      now,
      arrivalDelayMinutes * 60_000,
      leaveDelayMinutes * 60_000,
    );

    if (decision.action === "cancelOpposite") {
      const opposite = pendingState[placeId];
      await cancelScheduledNotifications(opposite.notificationIds);
      delete pendingState[placeId];
      await setPendingState(pendingState);
      await logGeofence(
        trigger === "arrive"
          ? "Cancelled pending leave notification — returned before it fired"
          : "Cancelled pending arrival notification — drive-through detected",
        formatLogDetail({
          ...regionDetail,
          Reason:
            trigger === "arrive"
              ? "Device re-entered before the pending leave notification fired"
              : "Device exited before the pending arrival notification fired (drive-through)",
        }),
      );
      return;
    }

    if (decision.action === "suppressShortStay") {
      const arrivalDelayMs = arrivalDelayMinutes * 60_000;
      const stayMs = enteredAt !== undefined ? now - enteredAt : undefined;
      await logGeofence(
        "Suppressed leave notification — stay shorter than arrival delay",
        formatLogDetail({
          ...regionDetail,
          Reason: `Stayed ${stayMs !== undefined ? Math.round(stayMs / 1000) : "?"}s, less than the ${Math.round(arrivalDelayMs / 1000)}s arrival delay`,
        }),
      );
      return;
    }

    // Resolved once per batch (issue #51): the global defaults apply to every
    // reminder still set to "Use Default" for that setting.
    const [reminders, globalSound, globalVibration] = await Promise.all([
      getActiveRemindersForTrigger(placeId, trigger),
      getNotificationSound(),
      getNotificationVibration(),
    ]);
    if (reminders.length === 0) {
      await logGeofence(
        "No active reminders for this transition",
        formatLogDetail({ ...regionDetail, Trigger: trigger }),
      );
      return;
    }

    const delaySeconds = Math.round(decision.delayMs / 1000);
    const notificationIds: string[] = [];
    for (const reminder of reminders) {
      const sound = resolveOverride(reminder.sound, globalSound);
      const vibration = resolveOverride(reminder.vibration, globalVibration);
      const id = await presentReminderNotification(
        reminder.placeName,
        reminder.title,
        trigger,
        sound,
        vibration,
        delaySeconds,
      );
      notificationIds.push(id);

      await logVibrationOutcome(reminder, regionDetail, vibration, sound, delaySeconds);
    }

    pendingState[placeId] = { trigger, fireAt: now + decision.delayMs, notificationIds, reminders };
    await setPendingState(pendingState);
    await logGeofence(
      delaySeconds > 0 ? `Scheduled ${trigger} notification(s) in ${delaySeconds}s` : `Scheduled ${trigger} notification(s)`,
      formatLogDetail(regionDetail),
    );

    // Delay of 0 ("Immediately") elapses instantly — finalize right away
    // rather than waiting for the next transition or app foreground, so
    // behavior matches pre-delay delivery exactly.
    if (delaySeconds === 0) {
      await finalizeDuePending();
    }
  } catch (err) {
    await logException("Failed to present reminder notification", err, {
      ...regionDetail,
      Trigger: trigger,
    });
  }
});

/**
 * Requests the foreground + background location permissions geofencing needs,
 * plus notification permission. Throws `LocationPermissionDeniedError` if
 * either location permission is denied, mirroring `services/location.ts`.
 */
export async function requestGeofencingPermissions(): Promise<void> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== Location.PermissionStatus.GRANTED) {
    throw new LocationPermissionDeniedError();
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== Location.PermissionStatus.GRANTED) {
    throw new LocationPermissionDeniedError();
  }

  await requestNotificationPermission();
  await ensureNotificationChannels();
}

/**
 * Re-reads the set of places with active (enabled) reminders and replaces
 * the OS geofence region list with it. Safe to call repeatedly — e.g. on
 * every app launch or after a reminder/place change — since it no-ops when
 * the region set already matches what's registered (see
 * `LAST_SYNCED_REGIONS_KEY`). Stops monitoring entirely when there are no
 * active reminders left, so nothing is watched for no reason.
 */
export async function syncGeofences(): Promise<void> {
  const regions = await getGeofenceRegions();

  if (regions.length === 0) {
    if (await Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME)) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
    }
    await AsyncStorage.removeItem(LAST_SYNCED_REGIONS_KEY);
    await AsyncStorage.removeItem(OCCUPANCY_KEY);
    await clearAllPending();
    return;
  }

  const signature = regionsSignature(regions);
  const [alreadyStarted, lastSignature] = await Promise.all([
    Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME),
    AsyncStorage.getItem(LAST_SYNCED_REGIONS_KEY),
  ]);

  // A place dropped from the region set (reminder deleted/disabled) should
  // never leave a stale pending notification behind, whether or not the
  // signature check below causes a full re-registration.
  await dropPendingForUnmonitoredPlaces(regions.map((region) => region.placeId));

  // Skip re-registering when the monitored regions haven't actually changed —
  // see `LAST_SYNCED_REGIONS_KEY` above for why this matters.
  if (alreadyStarted && signature === lastSignature) return;

  // Every region listens for both transitions regardless of which trigger(s)
  // a place's reminders use — the task needs to see both to tell a genuine
  // stay from a drive-through (see `planTransition`).
  const locationRegions: Location.LocationRegion[] = regions.map((region) => ({
    identifier: region.placeId,
    latitude: region.latitude,
    longitude: region.longitude,
    radius: region.radius,
    notifyOnEnter: true,
    notifyOnExit: true,
  }));

  await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, locationRegions);
  await AsyncStorage.setItem(LAST_SYNCED_REGIONS_KEY, signature);
  await seedOccupancy(regions);
}

/** Cancels and drops every pending delivery — used when geofencing stops entirely. */
async function clearAllPending(): Promise<void> {
  const pendingState = await getPendingState();
  const allIds = Object.values(pendingState).flatMap((entry) => entry.notificationIds);
  if (allIds.length > 0) {
    await cancelScheduledNotifications(allIds);
  }
  await AsyncStorage.removeItem(PENDING_KEY);
}

/** Cancels and drops any pending delivery for a place no longer in the monitored set. */
async function dropPendingForUnmonitoredPlaces(monitoredPlaceIds: string[]): Promise<void> {
  const pendingState = await getPendingState();
  const monitored = new Set(monitoredPlaceIds);
  const stalePlaceIds = Object.keys(pendingState).filter((placeId) => !monitored.has(placeId));
  if (stalePlaceIds.length === 0) return;

  for (const placeId of stalePlaceIds) {
    await cancelScheduledNotifications(pendingState[placeId].notificationIds);
    delete pendingState[placeId];
  }
  await setPendingState(pendingState);
}

/**
 * Snapshots which of the given regions the device is currently inside, right
 * after (re)registering them — see `OCCUPANCY_KEY` for why this matters. Reads
 * the device's actual position so the task handler can recognize Android's
 * immediate post-registration transition as "no real change" rather than a
 * genuine arrival/departure. If the position can't be determined, every
 * region is conservatively seeded as "inside", which suppresses a possible
 * spurious ENTER rather than risk a false arrival notification.
 */
async function seedOccupancy(regions: GeofenceRegion[]): Promise<void> {
  let position: Location.LocationObject | null = null;
  try {
    position = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync());
  } catch (err) {
    await logException("Failed to read position while seeding geofence occupancy", err, {
      "Region count": regions.length,
    });
  }

  const occupancy: Record<string, boolean> = {};
  for (const region of regions) {
    occupancy[region.placeId] = position
      ? distanceMeters(position.coords, region) <= region.radius
      : true;
  }

  // `enteredAt` is intentionally left empty: we don't know when a place the
  // device is already inside was actually entered, so it's treated as a
  // confirmed stay (see `planTransition`) rather than risking a false
  // "drive-through" suppression of a genuine leave reminder.
  await setOccupancyState({ registeredAt: Date.now(), occupancy, enteredAt: {} });
}
