import { getDatabase } from "@/db/database";
import type { NewPlace, Place, PlaceColor, PlaceIconName, PlaceUpdate } from "@/types/place";

/** Default geofence trigger radius (meters) for places created without one. */
export const DEFAULT_GEOFENCE_RADIUS_M = 150;

/** Raw row shape as stored in SQLite (snake_case columns), plus a joined reminder count. */
type PlaceRowRecord = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  icon: string;
  color: string;
  radius: number;
  created_at: number;
  reminder_count: number;
};

function toPlace(row: PlaceRowRecord): Place {
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? undefined,
    latitude: row.latitude,
    longitude: row.longitude,
    icon: row.icon as PlaceIconName,
    color: row.color as PlaceColor,
    radius: row.radius,
    reminderCount: row.reminder_count,
  };
}

/** Persists a new place. Throws on failure — callers surface a friendly error. */
export async function insertPlace(place: NewPlace): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO places (id, name, address, latitude, longitude, icon, color, radius, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    place.id,
    place.name,
    place.address ?? null,
    place.latitude,
    place.longitude,
    place.icon,
    place.color,
    place.radius ?? DEFAULT_GEOFENCE_RADIUS_M,
    Date.now(),
  );
}

/**
 * Updates a place's editable fields — name, address and location (issue #87).
 * A plain `UPDATE … WHERE id = ?`: the id never changes and `reminders` is
 * never touched, so a place's reminders (ids, settings, count) are
 * untouched. Callers re-sync geofences afterwards if the location moved.
 */
export async function updatePlace(id: string, changes: PlaceUpdate): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE places SET name = ?, address = ?, latitude = ?, longitude = ? WHERE id = ?`,
    changes.name,
    changes.address ?? null,
    changes.latitude,
    changes.longitude,
    id,
  );
}

/** Reads all saved places (with a live reminder count), most recently created first. */
export async function getAllPlaces(): Promise<Place[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<PlaceRowRecord>(
    `SELECT p.*, (SELECT COUNT(*) FROM reminders r WHERE r.place_id = p.id) AS reminder_count
     FROM places p
     ORDER BY p.created_at DESC`,
  );
  return rows.map(toPlace);
}

/**
 * Reads a single place's name, for labelling Event Log rows (issue #70) that
 * only have a place id (the geofence region identifier) to work from.
 * Returns `null` if the place no longer exists (e.g. deleted since the
 * region fired) rather than throwing — callers show a fallback label.
 */
export async function getPlaceName(id: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ name: string }>("SELECT name FROM places WHERE id = ?", id);
  return row?.name ?? null;
}

/**
 * Deletes every saved place. Used by restore (`services/backup.ts`), which
 * replaces all local data with an imported backup — callers must delete
 * reminders first (`remindersRepository.deleteAllReminders`) to satisfy the
 * `reminders.place_id → places(id)` reference.
 */
export async function deleteAllPlaces(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM places");
}

/**
 * Deletes a single place and every reminder that references it (issue #26).
 * Runs in a transaction, deleting reminders first to satisfy the
 * `reminders.place_id → places(id)` reference. Throws on failure — callers
 * surface a friendly error.
 */
export async function deletePlace(id: string): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM reminders WHERE place_id = ?", id);
    await db.runAsync("DELETE FROM places WHERE id = ?", id);
  });
}
