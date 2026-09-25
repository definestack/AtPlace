import type { PlaceColor, PlaceIconName } from "@/types/place";
import type { ReminderTrigger } from "@/types/reminder";

/**
 * A persisted record of a reminder notification that was delivered to the
 * user (issue #40), backing the in-app Notifications inbox. Place/reminder
 * display fields are captured as a snapshot at delivery time (not joined at
 * read time like `Reminder`) so a row still renders correctly if the source
 * reminder or place is later edited or deleted; `reminderId`/`placeId` are
 * kept only as an optional link back to the live data.
 */
export type AppNotification = {
  id: string;
  reminderId?: string;
  placeId?: string;
  reminderTitle: string;
  placeName: string;
  placeIcon: PlaceIconName;
  placeColor: PlaceColor;
  trigger: ReminderTrigger;
  read: boolean;
  createdAt: number;
};

/** Input for creating a new notification row — `id`/`read`/`createdAt` are assigned on insert. */
export type NewNotification = Omit<AppNotification, "id" | "read" | "createdAt">;
