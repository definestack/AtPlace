import { create } from "zustand";

import type { Coordinates } from "@/types/location";

type PickedLocation = Coordinates & { address: string };

type PlaceLocationPickState = {
  /** Set by the map picker's "pick" mode (issue #87); consumed by Edit Place. */
  picked: PickedLocation | null;
  setPicked: (location: PickedLocation) => void;
  consumePicked: () => void;
};

/**
 * Transient, in-memory nav intent — not persisted. Mirrors
 * `reminderFlowStore`'s pattern: lets `SelectLocationScreen`'s "pick" mode
 * hand a chosen location back to Edit Place (a screen already on the stack)
 * instead of pushing forward into the Add Place flow.
 */
export const usePlaceLocationPickStore = create<PlaceLocationPickState>((set) => ({
  picked: null,
  setPicked: (location) => set({ picked: location }),
  consumePicked: () => set({ picked: null }),
}));
