import type { PlaceColor, PlaceIconName } from "@/types/place";

/** When a reminder fires relative to the associated place. */
export type ReminderTrigger = "arrive" | "leave";

/**
 * A reminder tied to a saved place. Carries the place's icon/color/name
 * directly so the Reminders list can render a row without a join lookup.
 */
export type Reminder = {
  id: string;
  title: string;
  placeName: string;
  placeIcon: PlaceIconName;
  placeColor: PlaceColor;
  trigger: ReminderTrigger;
  enabled: boolean;
};
