import { create } from "zustand";

type ReminderFlowState = {
  /** Set while the Add Place flow was launched from the reminder place
   * picker, so `PlaceDetailsScreen` knows to return into the reminder flow
   * instead of dismissing everything back to the tabs. */
  addPlaceForReminder: boolean;
  /** Id of the place just created for the reminder flow; consumed by the
   * picker to auto-advance to the reminder details step. */
  createdPlaceId: string | null;
  startAddPlaceForReminder: () => void;
  completeAddPlaceForReminder: (placeId: string) => void;
  consumeCreatedPlaceId: () => void;
  cancelAddPlaceForReminder: () => void;
};

/**
 * Transient, in-memory nav intent (issue #58) — not persisted. Lets the Add
 * Place flow, which is pushed as a separate root-level stack, hand a
 * newly-created place back to the reminder flow's place picker rather than
 * always dismissing to the tabs.
 */
export const useReminderFlowStore = create<ReminderFlowState>((set) => ({
  addPlaceForReminder: false,
  createdPlaceId: null,
  startAddPlaceForReminder: () => set({ addPlaceForReminder: true, createdPlaceId: null }),
  completeAddPlaceForReminder: (placeId) =>
    set({ addPlaceForReminder: false, createdPlaceId: placeId }),
  consumeCreatedPlaceId: () => set({ createdPlaceId: null }),
  cancelAddPlaceForReminder: () => set({ addPlaceForReminder: false }),
}));
