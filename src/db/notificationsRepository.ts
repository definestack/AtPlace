import { getDatabase } from "@/db/database";
import { generateId } from "@/utils/id";
import type { PlaceColor, PlaceIconName } from "@/types/place";
import type { AppNotification, NewNotification } from "@/types/notification";
import type { ReminderTrigger } from "@/types/reminder";

/**
 * Read notifications older than this are no longer shown (issue #40
 * retention rule); unread notifications are retained regardless of age.
 */
const READ_RETENTION_MS = 24 * 60 * 60 * 1000;

type NotificationRowRecord = {
  id: string;
  reminder_id: string | null;
  place_id: string | null;
  reminder_title: string;
  place_name: string;
  place_icon: string;
  place_color: string;
  trigger: string;
  read: number;
  created_at: number;
};

function toNotification(row: NotificationRowRecord): AppNotification {
  return {
    id: row.id,
    reminderId: row.reminder_id ?? undefined,
    placeId: row.place_id ?? undefined,
    reminderTitle: row.reminder_title,
    placeName: row.place_name,
    placeIcon: row.place_icon as PlaceIconName,
    placeColor: row.place_color as PlaceColor,
    trigger: row.trigger as ReminderTrigger,
    read: row.read === 1,
    createdAt: row.created_at,
  };
}

/**
 * Persists a new notification row (unread) and prunes read rows past the
 * retention window, so the table can't grow unbounded on a device that
 * never opens the Notifications screen. Throws on failure — called from the
 * geofence task, which already wraps notification delivery in a try/catch.
 */
export async function insertNotification(entry: NewNotification): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO notifications
       (id, reminder_id, place_id, reminder_title, place_name, place_icon, place_color, trigger, read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    generateId(),
    entry.reminderId ?? null,
    entry.placeId ?? null,
    entry.reminderTitle,
    entry.placeName,
    entry.placeIcon,
    entry.placeColor,
    entry.trigger,
    Date.now(),
  );
  await db.runAsync(
    "DELETE FROM notifications WHERE read = 1 AND created_at < ?",
    Date.now() - READ_RETENTION_MS,
  );
}

/**
 * Reads notifications for the Notifications screen, newest first, applying
 * the retention rule directly in the query: unread notifications are always
 * included, read notifications only within the last 24 hours.
 */
export async function getVisibleNotifications(): Promise<AppNotification[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<NotificationRowRecord>(
    `SELECT id, reminder_id, place_id, reminder_title, place_name, place_icon, place_color, trigger, read, created_at
     FROM notifications
     WHERE read = 0 OR created_at >= ?
     ORDER BY created_at DESC`,
    Date.now() - READ_RETENTION_MS,
  );
  return rows.map(toNotification);
}

/** Sets a single notification's read/unread state (row swipe action). */
export async function setNotificationRead(id: string, read: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("UPDATE notifications SET read = ? WHERE id = ?", read ? 1 : 0, id);
}

/** Marks every notification as read ("Mark all as read" action). */
export async function markAllNotificationsRead(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("UPDATE notifications SET read = 1 WHERE read = 0");
}

/** Deletes a single notification (row swipe action). */
export async function deleteNotification(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM notifications WHERE id = ?", id);
}

/** Deletes every notification. Used by restore (`services/backup.ts`). */
export async function deleteAllNotifications(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM notifications");
}
