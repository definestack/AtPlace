import { create } from "zustand";

import {
  deleteNotification as deleteNotificationRow,
  getVisibleNotifications,
  markAllNotificationsRead,
  setNotificationRead,
} from "@/db/notificationsRepository";
import type { AppNotification } from "@/types/notification";

type NotificationsState = {
  notifications: AppNotification[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markUnread: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
};

/**
 * Notification inbox (issue #40), backed by SQLite
 * (`src/db/notificationsRepository.ts`). Mirrors the hydrate-on-launch,
 * mutate-then-reread pattern of `remindersStore` — this store is just an
 * in-memory projection of `getVisibleNotifications()`, which already applies
 * the read/24h retention rule. Mutators reject on failure so screens can
 * show a friendly error instead of failing silently.
 */
export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const notifications = await getVisibleNotifications();
      set({ notifications });
    } finally {
      set({ hydrated: true });
    }
  },
  markRead: async (id) => {
    await setNotificationRead(id, true);
    const notifications = await getVisibleNotifications();
    set({ notifications });
  },
  markUnread: async (id) => {
    await setNotificationRead(id, false);
    const notifications = await getVisibleNotifications();
    set({ notifications });
  },
  markAllRead: async () => {
    await markAllNotificationsRead();
    const notifications = await getVisibleNotifications();
    set({ notifications });
  },
  deleteNotification: async (id) => {
    await deleteNotificationRow(id);
    const notifications = await getVisibleNotifications();
    set({ notifications });
  },
}));
