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
