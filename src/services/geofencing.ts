import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

import { insertNotification } from "@/db/notificationsRepository";
import { getActiveRemindersForTrigger, getGeofenceRegions, type GeofenceRegion } from "@/db/remindersRepository";
import { logException, logGeofence, logNotification } from "@/services/logger";
import { LocationPermissionDeniedError } from "@/services/location";
import {
  ensureNotificationChannels,
  presentReminderNotification,
  requestNotificationPermission,
} from "@/services/notifications";
import {
  getNotificationSound,
  getNotificationVibration,
  getNotificationsEnabled,
} from "@/store/settingsStore";
import type { ReminderTrigger } from "@/types/reminder";
import { distanceMeters } from "@/utils/geo";
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
      .map((r) => [r.placeId, r.latitude, r.longitude, r.radius, r.notifyOnEnter, r.notifyOnExit]),
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
 */
const OCCUPANCY_KEY = "atplace.geofenceOccupancy";

/** Backstop for a contradictory transition delivered shortly after registration. */
const SETTLE_MS = 30_000;

type OccupancyState = {
  registeredAt: number;
  occupancy: Record<string, boolean>;
};

async function getOccupancyState(): Promise<OccupancyState> {
  const raw = await AsyncStorage.getItem(OCCUPANCY_KEY);
  if (!raw) return { registeredAt: 0, occupancy: {} };
  try {
    return JSON.parse(raw) as OccupancyState;
  } catch {
    return { registeredAt: 0, occupancy: {} };
  }
}

async function setOccupancyState(state: OccupancyState): Promise<void> {
  await AsyncStorage.setItem(OCCUPANCY_KEY, JSON.stringify(state));
}

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
): { notify: boolean; nextInside: boolean } {
  const expectedInside = trigger === "arrive";
  const known = state.occupancy[placeId];

  // Already known to be in the state this event claims to move us to — not a
  // real change (this is the immediate post-registration transition, or a
  // duplicate delivery).
  if (known === expectedInside) return { notify: false, nextInside: expectedInside };

  // An apparent transition delivered shortly after (re)registration is still
  // treated as the initial trigger rather than a real move, in case Android
  // delivers it a little late. Occupancy is left as last known (falling back
  // to "not expected" if we never seeded it at all).
  if (now - state.registeredAt < SETTLE_MS) {
    return { notify: false, nextInside: known ?? !expectedInside };
  }

  return { notify: true, nextInside: expectedInside };
}

type GeofenceTaskData = {
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
};

/**
 * Registered at module scope (not inside a component) so the OS can relaunch
 * the JS runtime in the background and immediately find this task — per
 * `expo-task-manager`'s requirement that `defineTask` run in the global
 * scope. `region.identifier` is the place's id (see `syncGeofences`).
 */
TaskManager.defineTask<GeofenceTaskData>(GEOFENCE_TASK_NAME, async ({ data, error }) => {
  if (error) {
    await logException("Geofencing task error", error);
    return;
  }
  if (!data) return;

  const { eventType, region } = data;
  const placeId = region.identifier;
  if (!placeId) return;

  const trigger: ReminderTrigger =
    eventType === Location.GeofencingEventType.Enter ? "arrive" : "leave";
  await logGeofence(`${trigger === "arrive" ? "Entered" : "Exited"} region`, placeId);

  try {
    // Tell a genuine arrival/departure apart from the immediate ENTER/EXIT
    // Android fires for every region as soon as it's registered (issue #46).
    // Occupancy is updated regardless of what happens below so it never
    // drifts from reality.
    const occupancyState = await getOccupancyState();
    const { notify, nextInside } = shouldNotify(trigger, placeId, occupancyState, Date.now());
    await setOccupancyState({
      ...occupancyState,
      occupancy: { ...occupancyState.occupancy, [placeId]: nextInside },
    });
    if (!notify) {
      await logGeofence("Suppressed — not a genuine transition", placeId);
      return;
    }

    // Settings screen "Notifications" toggle (issue #12): keep geofencing
    // itself running, but suppress the resulting notification when disabled.
    if (!(await getNotificationsEnabled())) {
      await logNotification("Suppressed — notifications disabled in Settings", placeId);
      return;
    }

    // Resolved once per batch (issue #51): the global defaults apply to every
    // reminder still set to "Use Default" for that setting.
    const [globalSound, globalVibration] = await Promise.all([
      getNotificationSound(),
      getNotificationVibration(),
    ]);

    const reminders = await getActiveRemindersForTrigger(placeId, trigger);
    for (const reminder of reminders) {
      const sound = resolveOverride(reminder.sound, globalSound);
      const vibration = resolveOverride(reminder.vibration, globalVibration);
      await presentReminderNotification(reminder.placeName, reminder.title, trigger, sound, vibration);
      await logNotification(`Presented "${reminder.title}"`, reminder.placeName);
      // Persist a notification-inbox row alongside the OS notification
      // (issue #40), so the in-app Notifications screen has a record of
      // deliveries that happened while the app was closed. A denormalized
      // snapshot of the reminder/place is stored so the row still renders
      // correctly even if the reminder or place is later edited/deleted.
      await insertNotification({
        reminderId: reminder.reminderId,
        placeId,
        reminderTitle: reminder.title,
        placeName: reminder.placeName,
        placeIcon: reminder.placeIcon,
        placeColor: reminder.placeColor,
        trigger,
      });
    }
  } catch (err) {
    await logException("Failed to present reminder notification", err);
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
    return;
  }

  const signature = regionsSignature(regions);
  const [alreadyStarted, lastSignature] = await Promise.all([
    Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME),
    AsyncStorage.getItem(LAST_SYNCED_REGIONS_KEY),
  ]);

  // Skip re-registering when the monitored regions haven't actually changed —
  // see `LAST_SYNCED_REGIONS_KEY` above for why this matters.
  if (alreadyStarted && signature === lastSignature) return;

  const locationRegions: Location.LocationRegion[] = regions.map((region) => ({
    identifier: region.placeId,
    latitude: region.latitude,
    longitude: region.longitude,
    radius: region.radius,
    notifyOnEnter: region.notifyOnEnter,
    notifyOnExit: region.notifyOnExit,
  }));

  await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, locationRegions);
  await AsyncStorage.setItem(LAST_SYNCED_REGIONS_KEY, signature);
  await seedOccupancy(regions);
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
    await logException("Failed to read position while seeding geofence occupancy", err);
  }

  const occupancy: Record<string, boolean> = {};
  for (const region of regions) {
    occupancy[region.placeId] = position
      ? distanceMeters(position.coords, region) <= region.radius
      : true;
  }

  await setOccupancyState({ registeredAt: Date.now(), occupancy });
}
