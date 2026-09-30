import { insertLog } from "@/db/logsRepository";
import { isDiagnosticLoggingEnabled } from "@/store/settingsStore";
import type { LogCategory } from "@/types/log";
import { describeError, formatLogDetail, joinLogDetail } from "@/utils/logFormat";

/**
 * Writes a diagnostic log row and never throws — a failed log write must not
 * break notification delivery or geofence handling in the background task
 * that's calling it. Falls back to `console` so the event is still visible
 * during development if the DB write itself fails.
 */
async function persist(category: LogCategory, message: string, detail?: string): Promise<void> {
  try {
    await insertLog({ category, message, detail });
  } catch (err) {
    console.error(`[logger] failed to persist ${category} log:`, message, err);
  }
}

/**
 * Gated diagnostic logging (issue #68/#37): only persists when Developer
 * Mode and the Logging setting are both on — see
 * `settingsStore.isDiagnosticLoggingEnabled`. Errors in the check itself are
 * swallowed for the same reason `persist` never throws.
 */
async function log(category: LogCategory, message: string, detail?: string): Promise<void> {
  try {
    if (!(await isDiagnosticLoggingEnabled())) return;
  } catch {
    return;
  }
  await persist(category, message, detail);
}

/** Logs a geofence transition or sync event (region entered/exited, regions re-synced). */
export function logGeofence(message: string, detail?: string): Promise<void> {
  return log("geofence", message, detail);
}

/** Logs a notification delivered or suppressed. */
export function logNotification(message: string, detail?: string): Promise<void> {
  return log("notification", message, detail);
}

/** Logs a vibration request and whether it was actually triggered (issue #70). */
export function logVibration(message: string, detail?: string): Promise<void> {
  return log("vibration", message, detail);
}

/**
 * Logs an unexpected error, capturing its type/message/cause-chain/stack
 * (issue #70) as `detail`, alongside optional `context` describing the
 * operation that failed (e.g. the place/region involved).
 *
 * Unlike the other `log*` helpers, this always persists regardless of the
 * Logging setting (issue #68) — it's the "mandatory system/error logging"
 * that stays on even when diagnostic logging is disabled.
 */
export function logException(
  message: string,
  error: unknown,
  context?: Record<string, string | number | undefined>,
): Promise<void> {
  console.error(message, error);
  const detail = joinLogDetail(formatLogDetail(context ?? {}), describeError(error));
  return persist("exception", message, detail);
}

/** Logs an informational event that isn't a geofence/notification/vibration/exception. */
export function logInfo(message: string, detail?: string): Promise<void> {
  return log("info", message, detail);
}
