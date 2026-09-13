import { create } from "zustand";

import { getAllReminders, insertReminder, setReminderEnabled } from "@/db/remindersRepository";
import type { NewReminder, Reminder } from "@/types/reminder";

type RemindersState = {
  reminders: Reminder[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addReminder: (reminder: NewReminder) => Promise<void>;
  setEnabled: (id: string, enabled: boolean) => Promise<void>;
};

/**
 * Reminders, backed by SQLite (`src/db/remindersRepository.ts`). Mirrors the
 * hydrate-on-launch pattern of `placesStore` — this store is just an
 * in-memory projection of the database. `addReminder`/`setEnabled` reject on
 * failure so screens can show a friendly error instead of failing silently.
 */
export const useRemindersStore = create<RemindersState>((set) => ({
  reminders: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const reminders = await getAllReminders();
      set({ reminders });
    } finally {
      set({ hydrated: true });
    }
  },
  addReminder: async (reminder) => {
    await insertReminder(reminder);
    const reminders = await getAllReminders();
    set({ reminders });
  },
  setEnabled: async (id, enabled) => {
    await setReminderEnabled(id, enabled);
    const reminders = await getAllReminders();
    set({ reminders });
  },
}));
