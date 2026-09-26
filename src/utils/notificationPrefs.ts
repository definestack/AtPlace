import type { NotificationOverride } from "@/types/reminder";

/**
 * Resolves a reminder's per-setting notification override against the
 * current global default (issue #51). `"on"`/`"off"` always win; `"default"`
 * defers to whatever the global Settings > Notifications value currently is,
 * so toggling the global setting immediately affects every reminder that
 * hasn't explicitly overridden it.
 */
export function resolveOverride(override: NotificationOverride, globalValue: boolean): boolean {
  switch (override) {
    case "on":
      return true;
    case "off":
      return false;
    case "default":
      return globalValue;
  }
}
