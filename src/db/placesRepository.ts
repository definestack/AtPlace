import { getDatabase } from "@/db/database";
import type { NewPlace, Place, PlaceColor, PlaceIconName } from "@/types/place";

/** Raw row shape as stored in SQLite (snake_case columns), plus a joined reminder count. */
type PlaceRowRecord = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  icon: string;
  color: string;
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
    reminderCount: row.reminder_count,
  };
}

/** Persists a new place. Throws on failure — callers surface a friendly error. */
export async function insertPlace(place: NewPlace): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO places (id, name, address, latitude, longitude, icon, color, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    place.id,
    place.name,
    place.address ?? null,
    place.latitude,
    place.longitude,
    place.icon,
    place.color,
    Date.now(),
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
