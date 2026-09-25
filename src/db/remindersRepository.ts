import { getDatabase } from "@/db/database";
import type { PlaceColor, PlaceIconName } from "@/types/place";
import type { NewReminder, Reminder, ReminderTrigger } from "@/types/reminder";

/** Raw row shape as read back via a join with `places`. */
type ReminderRowRecord = {
  id: string;
  place_id: string;
  title: string;
  trigger: string;
  enabled: number;
  place_name: string;
  place_icon: string;
  place_color: string;
};

function toReminder(row: ReminderRowRecord): Reminder {
  return {
    id: row.id,
    placeId: row.place_id,
    title: row.title,
    trigger: row.trigger as ReminderTrigger,
    enabled: row.enabled === 1,
    placeName: row.place_name,
    placeIcon: row.place_icon as PlaceIconName,
    placeColor: row.place_color as PlaceColor,
  };
}

/** Persists a new reminder. Throws on failure — callers surface a friendly error. */
export async function insertReminder(reminder: NewReminder): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO reminders (id, place_id, title, trigger, enabled, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    reminder.id,
    reminder.placeId,
    reminder.title,
    reminder.trigger,
    reminder.enabled ? 1 : 0,
    Date.now(),
  );
}

/** Reads all reminders (joined with their place), most recently created first. */
export async function getAllReminders(): Promise<Reminder[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ReminderRowRecord>(
    `SELECT r.id, r.place_id, r.title, r.trigger, r.enabled,
            p.name AS place_name, p.icon AS place_icon, p.color AS place_color
     FROM reminders r
     JOIN places p ON p.id = r.place_id
     ORDER BY r.created_at DESC`,
  );
  return rows.map(toReminder);
}

/** Updates a reminder's enabled state (Home screen toggle). */
export async function setReminderEnabled(id: string, enabled: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("UPDATE reminders SET enabled = ? WHERE id = ?", enabled ? 1 : 0, id);
}

/** Deletes a single reminder. Throws on failure — callers surface a friendly error. */
export async function deleteReminder(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM reminders WHERE id = ?", id);
}

/**
 * Deletes every reminder. Used by restore (`services/backup.ts`), which
 * replaces all local data with an imported backup — must run before
 * `placesRepository.deleteAllPlaces` since `reminders.place_id` references
 * `places(id)`.
 */
export async function deleteAllReminders(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM reminders");
}

/**
 * A place that should be actively geofenced, because it has at least one
 * enabled reminder. `notifyOnEnter`/`notifyOnExit` mirror `Location.LocationRegion`
 * and are derived from whether an enabled `arrive`/`leave` reminder exists for
 * this place, so the OS only wakes the geofence task for transitions that
 * matter (issue #10).
 */
export type GeofenceRegion = {
  placeId: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  notifyOnEnter: boolean;
  notifyOnExit: boolean;
};

type GeofenceRegionRowRecord = {
  place_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  notify_on_enter: number;
  notify_on_exit: number;
};

/**
 * Reads one row per place with at least one enabled reminder, for syncing
 * against `Location.startGeofencingAsync`. Places with no enabled reminders
 * are omitted entirely (AC: "only triggers for active reminders").
 */
export async function getGeofenceRegions(): Promise<GeofenceRegion[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<GeofenceRegionRowRecord>(
    `SELECT p.id AS place_id, p.name, p.latitude, p.longitude, p.radius,
            MAX(CASE WHEN r.trigger = 'arrive' THEN 1 ELSE 0 END) AS notify_on_enter,
            MAX(CASE WHEN r.trigger = 'leave' THEN 1 ELSE 0 END) AS notify_on_exit
     FROM places p
     JOIN reminders r ON r.place_id = p.id AND r.enabled = 1
     GROUP BY p.id`,
  );
  return rows.map((row) => ({
    placeId: row.place_id,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    radius: row.radius,
    notifyOnEnter: row.notify_on_enter === 1,
    notifyOnExit: row.notify_on_exit === 1,
  }));
}

/**
 * A reminder's display text, for building a geofence-triggered notification
 * and the notification-history row it leaves behind (issue #40).
 */
export type ActiveReminderSummary = {
  reminderId: string;
  title: string;
  placeName: string;
  placeIcon: PlaceIconName;
  placeColor: PlaceColor;
};

/**
 * Reads the enabled reminders for a place matching the given trigger
 * (`"arrive"` on geofence enter, `"leave"` on exit) — called from the
 * geofencing task handler to build notification content.
 */
export async function getActiveRemindersForTrigger(
  placeId: string,
  trigger: ReminderTrigger,
): Promise<ActiveReminderSummary[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    reminder_id: string;
    title: string;
    place_name: string;
    place_icon: string;
    place_color: string;
  }>(
    `SELECT r.id AS reminder_id, r.title, p.name AS place_name, p.icon AS place_icon, p.color AS place_color
     FROM reminders r
     JOIN places p ON p.id = r.place_id
     WHERE r.place_id = ? AND r.trigger = ? AND r.enabled = 1`,
    placeId,
    trigger,
  );
  return rows.map((row) => ({
    reminderId: row.reminder_id,
    title: row.title,
    placeName: row.place_name,
    placeIcon: row.place_icon as PlaceIconName,
    placeColor: row.place_color as PlaceColor,
  }));
}
