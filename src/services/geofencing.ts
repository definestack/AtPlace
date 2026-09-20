import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

import { getActiveRemindersForTrigger, getGeofenceRegions, type GeofenceRegion } from "@/db/remindersRepository";
import { LocationPermissionDeniedError } from "@/services/location";
import { presentReminderNotification, requestNotificationPermission } from "@/services/notifications";
import { getNotificationsEnabled } from "@/store/settingsStore";
import type { ReminderTrigger } from "@/types/reminder";

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
    console.error("Geofencing task error:", error);
    return;
  }
  if (!data) return;

  const { eventType, region } = data;
  const placeId = region.identifier;
  if (!placeId) return;

  const trigger: ReminderTrigger =
    eventType === Location.GeofencingEventType.Enter ? "arrive" : "leave";

  try {
    // Settings screen "Notifications" toggle (issue #12): keep geofencing
    // itself running, but suppress the resulting notification when disabled.
    if (!(await getNotificationsEnabled())) return;

    const reminders = await getActiveRemindersForTrigger(placeId, trigger);
    for (const reminder of reminders) {
      await presentReminderNotification(reminder.placeName, reminder.title, trigger);
    }
  } catch (err) {
    console.error("Failed to present reminder notification:", err);
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
}
