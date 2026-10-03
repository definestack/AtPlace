import { DELAY_OPTIONS_MINUTES, type DelayMinutes, type ReminderTrigger } from "@/types/reminder";

/**
 * Parses a stored/serialized delay value (AsyncStorage string, backup JSON
 * field, etc.) into a valid `DelayMinutes`, or `null` if it isn't one of the
 * allowed options. Shared by `settingsStore`'s legacy-key backfill
 * (`db/database.ts`) and `services/backup.ts`'s import.
 */
export function parseDelayMinutes(value: string | number | null | undefined): DelayMinutes | null {
  const parsed = value === null || value === undefined ? NaN : Number(value);
  return (DELAY_OPTIONS_MINUTES as readonly number[]).includes(parsed)
    ? (parsed as DelayMinutes)
    : null;
}

/** Human-readable label for a delay value, e.g. "Immediately" / "1 minute" / "3 minutes". */
export function delayLabel(minutes: DelayMinutes): string {
  if (minutes === 0) return "Immediately";
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

/** Short suffix for a reminder row, e.g. " · after 3 min". Empty for Immediately. */
export function delaySuffix(minutes: DelayMinutes): string {
  if (minutes === 0) return "";
  return ` · after ${minutes} min`;
}

/**
 * Help text shown under the Notification Delay selector on Add/Edit
 * Reminder, reflecting both the selected trigger and delay (issue #100).
 */
export function delayHelpText(trigger: ReminderTrigger, minutes: DelayMinutes): string {
  const verb = trigger === "arrive" ? "arriving" : "leaving";
  if (minutes === 0) {
    return `Notify immediately when ${trigger === "arrive" ? "arriving" : "leaving"}`;
  }
  return `Notify ${minutes} min after ${verb}`;
}
