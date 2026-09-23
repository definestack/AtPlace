import { getDatabase } from "@/db/database";
import { generateId } from "@/utils/id";
import type { LogCategory, LogEntry, NewLog } from "@/types/log";

/** Rows older than the newest `MAX_LOG_ROWS` are pruned on every insert, so the table can't grow unbounded on a device that's never opened the log viewer. */
const MAX_LOG_ROWS = 500;

type LogRowRecord = {
  id: string;
  category: string;
  message: string;
  detail: string | null;
  created_at: number;
};

function toLog(row: LogRowRecord): LogEntry {
  return {
    id: row.id,
    category: row.category as LogCategory,
    message: row.message,
    detail: row.detail ?? undefined,
    createdAt: row.created_at,
  };
}

/**
 * Persists a new log row and prunes anything past `MAX_LOG_ROWS`. Throws on
 * failure — callers (`services/logger.ts`) catch and fall back to `console`
 * so a logging failure never breaks the notification/geofence flow it's
 * observing.
 */
export async function insertLog(entry: NewLog): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO logs (id, category, message, detail, created_at) VALUES (?, ?, ?, ?, ?)`,
    generateId(),
    entry.category,
    entry.message,
    entry.detail ?? null,
    Date.now(),
  );
  await db.runAsync(
    `DELETE FROM logs WHERE id NOT IN (SELECT id FROM logs ORDER BY created_at DESC LIMIT ?)`,
    MAX_LOG_ROWS,
  );
}

/** Reads the most recent log rows, newest first, for the Event Log screen. */
export async function getRecentLogs(limit = 200): Promise<LogEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<LogRowRecord>(
    "SELECT id, category, message, detail, created_at FROM logs ORDER BY created_at DESC LIMIT ?",
    limit,
  );
  return rows.map(toLog);
}

/** Deletes every log row (Event Log screen "Clear" action). */
export async function deleteAllLogs(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM logs");
}
