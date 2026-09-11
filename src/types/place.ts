import type { Ionicons } from "@expo/vector-icons";

/** Icon glyph used for a place, drawn from the shared Ionicons set. */
export type PlaceIconName = keyof typeof Ionicons.glyphMap;

/**
 * Tint used for a place's icon background. Maps to brand color tokens in
 * `theme/colors.ts` / `tailwind.config.js` (e.g. `bg-teal`, `bg-plum`).
 */
export type PlaceColor = "teal" | "plum" | "mint" | "coral";

/** A saved location the user has associated reminders with. */
export type Place = {
  id: string;
  name: string;
  icon: PlaceIconName;
  color: PlaceColor;
  reminderCount: number;
};
