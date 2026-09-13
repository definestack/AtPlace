import { create } from "zustand";

import { getAllPlaces, insertPlace } from "@/db/placesRepository";
import type { NewPlace, Place } from "@/types/place";

type PlacesState = {
  places: Place[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addPlace: (place: NewPlace) => Promise<void>;
};

/**
 * Saved places, backed by SQLite (`src/db/placesRepository.ts`). Mirrors the
 * hydrate-on-launch pattern of `themeStore`, but the source of truth is the
 * database rather than AsyncStorage — this store is just an in-memory
 * projection of it. `addPlace` rejects on failure so screens can show a
 * friendly error instead of failing silently.
 */
export const usePlacesStore = create<PlacesState>((set) => ({
  places: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const places = await getAllPlaces();
      set({ places });
    } finally {
      set({ hydrated: true });
    }
  },
  addPlace: async (place) => {
    await insertPlace(place);
    const places = await getAllPlaces();
    set({ places });
  },
}));
