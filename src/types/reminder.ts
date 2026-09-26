import type { PlaceColor, PlaceIconName } from "@/types/place";

/** When a reminder fires relative to the associated place. */
export type ReminderTrigger = "arrive" | "leave";

/**
 * A per-reminder notification setting (issue #51): `"default"` inherits the
 * global Settings > Notifications value, while `"on"`/`"off"` explicitly
 * override it regardless of later global changes. See
 * `utils/notificationPrefs.ts` for how this is resolved to a boolean.
 */
export type NotificationOverride = "default" | "on" | "off";

/**
 * A reminder tied to a saved place. `placeId` is the source of truth for the
 * association; `placeName`/`placeIcon`/`placeColor` are joined in from the
 * place at read time (see `remindersRepository.ts`) so the Reminders list
 * can render a row without a separate lookup.
 */
export type Reminder = {
  id: string;
  placeId: string;
  title: string;
  placeName: string;
  placeIcon: PlaceIconName;
  placeColor: PlaceColor;
  trigger: ReminderTrigger;
  enabled: boolean;
  sound: NotificationOverride;
  vibration: NotificationOverride;
};

/** Input for creating a new reminder — place display fields are derived via join on read. */
export type NewReminder = {
  id: string;
  placeId: string;
  title: string;
  trigger: ReminderTrigger;
  enabled: boolean;
  sound: NotificationOverride;
  vibration: NotificationOverride;
};
