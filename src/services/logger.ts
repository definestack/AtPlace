import { insertLog } from "@/db/logsRepository";
import type { LogCategory } from "@/types/log";

/**
 * Writes a diagnostic log row (issue #37) and never throws — a failed log
 * write must not break notification delivery or geofence handling in the
 * background task that's calling it. Falls back to `console` so the event
 * is still visible during development if the DB write itself fails.
 */
async function log(category: LogCategory, message: string, detail?: string): Promise<void> {
  try {
    await insertLog({ category, message, detail });
  } catch (err) {
    console.error(`[logger] failed to persist ${category} log:`, message, err);
  }
}

/** Logs a geofence transition or sync event (region entered/exited, regions re-synced). */
export function logGeofence(message: string, detail?: string): Promise<void> {
  return log("geofence", message, detail);
}

/** Logs a notification delivered or suppressed. */
export function logNotification(message: string, detail?: string): Promise<void> {
  return log("notification", message, detail);
}

/** Logs an unexpected error, capturing its message/stack as `detail`. */
export function logException(message: string, error: unknown): Promise<void> {
  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(message, error);
  return log("exception", message, detail);
}

/** Logs an informational event that isn't a geofence/notification/exception. */
export function logInfo(message: string, detail?: string): Promise<void> {
  return log("info", message, detail);
}
