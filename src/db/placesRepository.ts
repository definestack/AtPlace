import { getDatabase } from "@/db/database";
import type { NewPlace, Place, PlaceColor, PlaceIconName } from "@/types/place";

/** Raw row shape as stored in SQLite (snake_case columns, no reminder count). */
type PlaceRowRecord = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  icon: string;
  color: string;
  created_at: number;
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
    // No reminders table yet — every place reports zero until that lands.
    reminderCount: 0,
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

/** Reads all saved places, most recently created first. */
export async function getAllPlaces(): Promise<Place[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<PlaceRowRecord>(
    "SELECT * FROM places ORDER BY created_at DESC",
  );
  return rows.map(toPlace);
}
