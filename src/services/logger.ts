import { deleteLogsOlderThan, insertLog } from "@/db/logsRepository";
import { getLogRetentionDays, isDiagnosticLoggingEnabled } from "@/store/settingsStore";
import type { LogCategory } from "@/types/log";
import { describeError, formatLogDetail, joinLogDetail } from "@/utils/logFormat";

const MS_PER_DAY = 86_400_000;

/** The epoch-ms cutoff below which a log row is older than `days` of retention (issue #89). */
export function logRetentionCutoff(days: number, now: number = Date.now()): number {
  return now - days * MS_PER_DAY;
}

/**
 * Deletes log rows older than the configured Log retention setting (issue
 * #89). Never throws — called both on launch and after every log write, and
 * a cleanup failure must not break the log write or app startup it runs
 * alongside.
 */
export async function pruneExpiredLogs(): Promise<void> {
  try {
    const days = await getLogRetentionDays();
    await deleteLogsOlderThan(logRetentionCutoff(days));
  } catch (err) {
    console.error("[logger] failed to prune expired logs:", err);
  }
}

/**
 * Writes a diagnostic log row and never throws — a failed log write must not
 * break notification delivery or geofence handling in the background task
 * that's calling it. Falls back to `console` so the event is still visible
 * during development if the DB write itself fails. Prunes rows past the
 * configured Log retention setting (issue #89) after a successful write.
 */
async function persist(category: LogCategory, message: string, detail?: string): Promise<void> {
  try {
    await insertLog({ category, message, detail });
  } catch (err) {
    console.error(`[logger] failed to persist ${category} log:`, message, err);
    return;
  }
  await pruneExpiredLogs();
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

/**
 * Logs a notification scheduled, delivered or suppressed. For a delayed
 * delivery, "delivered" means the app recorded its own bookkeeping for it —
 * not necessarily when Android actually showed it, which the app can't
 * observe directly (issue #78; see `finalizeDuePending` in
 * `services/geofencing.ts`).
 */
export function logNotification(message: string, detail?: string): Promise<void> {
  return log("notification", message, detail);
}

/** Logs a vibration request and whether it was actually triggered (issue #70). */
export function logVibration(message: string, detail?: string): Promise<void> {
  return log("vibration", message, detail);
}

/** Logs an app lifecycle event — JS runtime start, foreground/background, notification tap. */
export function logApp(message: string, detail?: string): Promise<void> {
  return log("app", message, detail);
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
