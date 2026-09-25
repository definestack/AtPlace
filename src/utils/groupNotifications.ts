import type { AppNotification } from "@/types/notification";

export type NotificationSection = {
  key: "today" | "yesterday" | "earlier";
  title: string;
  data: AppNotification[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(ms: number): number {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * Groups notifications by calendar day into TODAY / YESTERDAY / EARLIER
 * (issue #40). An "Earlier" bucket is needed alongside the ticket's
 * TODAY/YESTERDAY groups because unread notifications are retained
 * regardless of age (e.g. row F in the ticket's retention table is 3 days
 * old and unread) and still need a section to land in. Sections with no
 * notifications are omitted; order follows the input order (repo returns
 * newest-first), so each section's items stay newest-first too.
 */
export function groupNotificationsByDate(
  notifications: AppNotification[],
  now: number = Date.now(),
): NotificationSection[] {
  const todayStart = startOfDay(now);
  const yesterdayStart = todayStart - DAY_MS;

  const today: AppNotification[] = [];
  const yesterday: AppNotification[] = [];
  const earlier: AppNotification[] = [];

  for (const notification of notifications) {
    if (notification.createdAt >= todayStart) {
      today.push(notification);
    } else if (notification.createdAt >= yesterdayStart) {
      yesterday.push(notification);
    } else {
      earlier.push(notification);
    }
  }

  const sections: NotificationSection[] = [];
  if (today.length > 0) sections.push({ key: "today", title: "TODAY", data: today });
  if (yesterday.length > 0) sections.push({ key: "yesterday", title: "YESTERDAY", data: yesterday });
  if (earlier.length > 0) sections.push({ key: "earlier", title: "EARLIER", data: earlier });

  return sections;
}
