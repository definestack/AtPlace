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

/**
 * Human-readable summary of a reminder's Sound/Vibration overrides, shown on
 * the collapsed Notification row (issue #59). When both are left at their
 * default, calls this out explicitly; otherwise names each override so the
 * user can see what's customized without expanding the section.
 */
export function describeNotificationSummary(
  sound: NotificationOverride,
  vibration: NotificationOverride,
): string {
  if (sound === "default" && vibration === "default") {
    return "Using default sound and vibration";
  }
  const label = (override: NotificationOverride) =>
    override === "default" ? "default" : override === "on" ? "on" : "off";
  return `Sound ${label(sound)} · Vibration ${label(vibration)}`;
}
