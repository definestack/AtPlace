import { getDatabase } from "@/db/database";
import type { PlaceColor, PlaceIconName } from "@/types/place";
import type {
  DelayMinutes,
  NewReminder,
  NotificationOverride,
  Reminder,
  ReminderRepeat,
  ReminderTrigger,
} from "@/types/reminder";
import { parseDelayMinutes } from "@/utils/delay";

/** Raw row shape as read back via a join with `places`. */
type ReminderRowRecord = {
  id: string;
  place_id: string;
  title: string;
  trigger: string;
  enabled: number;
  sound_override: string;
  vibration_override: string;
  repeat: string;
  delay_minutes: number;
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
    sound: row.sound_override as NotificationOverride,
    vibration: row.vibration_override as NotificationOverride,
    repeat: row.repeat as ReminderRepeat,
    // Defensive fallback for a row somehow outside the allowed options —
    // should never happen post-migration, but never let a bad value throw.
    delayMinutes: parseDelayMinutes(row.delay_minutes) ?? 0,
    placeName: row.place_name,
    placeIcon: row.place_icon as PlaceIconName,
    placeColor: row.place_color as PlaceColor,
  };
}

/** Persists a new reminder. Throws on failure — callers surface a friendly error. */
export async function insertReminder(reminder: NewReminder): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO reminders (id, place_id, title, trigger, enabled, sound_override, vibration_override, repeat, delay_minutes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    reminder.id,
    reminder.placeId,
    reminder.title,
    reminder.trigger,
    reminder.enabled ? 1 : 0,
    reminder.sound,
    reminder.vibration,
    reminder.repeat,
    reminder.delayMinutes,
    Date.now(),
  );
}

/** Reads all reminders (joined with their place), most recently created first. */
export async function getAllReminders(): Promise<Reminder[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ReminderRowRecord>(
    `SELECT r.id, r.place_id, r.title, r.trigger, r.enabled, r.sound_override, r.vibration_override, r.repeat, r.delay_minutes,
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

/** Updates a reminder's editable fields (Edit Reminder screen, issue #51). */
export async function updateReminder(reminder: Reminder): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE reminders
     SET title = ?, trigger = ?, sound_override = ?, vibration_override = ?, repeat = ?, delay_minutes = ?
     WHERE id = ?`,
    reminder.title,
    reminder.trigger,
    reminder.sound,
    reminder.vibration,
    reminder.repeat,
    reminder.delayMinutes,
    reminder.id,
  );
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
 * enabled reminder. Every region registers for both ENTER and EXIT
 * transitions regardless of which trigger(s) the place's reminders use: the
 * geofence task needs to see both to tell a genuine arrival/departure apart
 * from a drive-through (see `services/geofencing.ts`'s pending-delivery
 * handling) even for a place with only `arrive` (or only `leave`) reminders.
 */
export type GeofenceRegion = {
  placeId: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
};

type GeofenceRegionRowRecord = {
  place_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
};

/**
 * Reads one row per place with at least one enabled reminder, for syncing
 * against `Location.startGeofencingAsync`. Places with no enabled reminders
 * are omitted entirely (AC: "only triggers for active reminders").
 */
export async function getGeofenceRegions(): Promise<GeofenceRegion[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<GeofenceRegionRowRecord>(
    `SELECT DISTINCT p.id AS place_id, p.name, p.latitude, p.longitude, p.radius
     FROM places p
     JOIN reminders r ON r.place_id = p.id AND r.enabled = 1`,
  );
  return rows.map((row) => ({
    placeId: row.place_id,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    radius: row.radius,
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
  sound: NotificationOverride;
  vibration: NotificationOverride;
  repeat: ReminderRepeat;
  /** This reminder's own Notification Delay (issue #100) — no longer a global setting. */
  delayMinutes: DelayMinutes;
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
    sound_override: string;
    vibration_override: string;
    repeat: string;
    delay_minutes: number;
  }>(
    `SELECT r.id AS reminder_id, r.title, p.name AS place_name, p.icon AS place_icon, p.color AS place_color,
            r.sound_override, r.vibration_override, r.repeat, r.delay_minutes
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
    sound: row.sound_override as NotificationOverride,
    vibration: row.vibration_override as NotificationOverride,
    repeat: row.repeat as ReminderRepeat,
    delayMinutes: parseDelayMinutes(row.delay_minutes) ?? 0,
  }));
}
