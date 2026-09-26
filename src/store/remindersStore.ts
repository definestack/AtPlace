import { create } from "zustand";

import {
  deleteReminder as deleteReminderRow,
  getAllReminders,
  insertReminder,
  setReminderEnabled,
  updateReminder as updateReminderRow,
} from "@/db/remindersRepository";
import type { NewReminder, Reminder } from "@/types/reminder";

type RemindersState = {
  reminders: Reminder[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addReminder: (reminder: NewReminder) => Promise<void>;
  updateReminder: (reminder: Reminder) => Promise<void>;
  setEnabled: (id: string, enabled: boolean) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
};

/**
 * Reminders, backed by SQLite (`src/db/remindersRepository.ts`). Mirrors the
 * hydrate-on-launch pattern of `placesStore` — this store is just an
 * in-memory projection of the database. `addReminder`/`updateReminder`/
 * `setEnabled`/`deleteReminder` reject on failure so screens can show a
 * friendly error instead of failing silently.
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
  updateReminder: async (reminder) => {
    await updateReminderRow(reminder);
    const reminders = await getAllReminders();
    set({ reminders });
  },
  setEnabled: async (id, enabled) => {
    await setReminderEnabled(id, enabled);
    const reminders = await getAllReminders();
    set({ reminders });
  },
  deleteReminder: async (id) => {
    await deleteReminderRow(id);
    const reminders = await getAllReminders();
    set({ reminders });
  },
}));
