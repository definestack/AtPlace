import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "atplace.themeMode";

type ThemeState = {
  mode: ThemeMode;
  hydrated: boolean;
  setMode: (mode: ThemeMode) => void;
  hydrate: () => Promise<void>;
};

/**
 * Persisted theme preference (Settings screen). Kept separate from
 * nativewind's own `useColorScheme`, which only holds the resolved value in
 * memory — this store is the source of truth that gets synced to it on
 * launch and on every change (see `src/app/_layout.tsx`).
 */
export const useThemeStore = create<ThemeState>((set) => ({
  mode: "system",
  hydrated: false,
  setMode: (mode) => {
    set({ mode });
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {});
  },
  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "system") {
        set({ mode: stored });
      }
    } finally {
      set({ hydrated: true });
    }
  },
}));
