import { create } from "zustand";

import type { DelayMinutes } from "@/types/reminder";

type ReminderDelayPickState = {
  /** Set by `ReminderDelayScreen` (issue #100); consumed by Add/Edit Reminder. */
  picked: DelayMinutes | null;
  setPicked: (minutes: DelayMinutes) => void;
  consumePicked: () => void;
};

/**
 * Transient, in-memory nav intent — not persisted. Mirrors
 * `placeLocationPickStore`'s pattern: lets the Notification Delay drill-in
 * hand a chosen value back to Add/Edit Reminder (a screen already on the
 * stack) instead of pushing forward.
 */
export const useReminderDelayPickStore = create<ReminderDelayPickState>((set) => ({
  picked: null,
  setPicked: (minutes) => set({ picked: minutes }),
  consumePicked: () => set({ picked: null }),
}));
