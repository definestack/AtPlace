const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Formats a timestamp as a short relative label for a notification row
 * (issue #40): "Just now", "Nm ago", "Nh ago" within the last day, then
 * falls back to a short localized date for anything older (unread
 * notifications can be retained for days — see retention rule).
 */
export function formatRelativeTime(ms: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - ms);

  if (diff < MINUTE_MS) return "Just now";
  if (diff < HOUR_MS) {
    const minutes = Math.floor(diff / MINUTE_MS);
    return `${minutes}m ago`;
  }
  if (diff < DAY_MS) {
    const hours = Math.floor(diff / HOUR_MS);
    return `${hours}h ago`;
  }

  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
