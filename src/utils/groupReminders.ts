import type { PlaceColor, PlaceIconName } from "@/types/place";
import type { Reminder } from "@/types/reminder";

export type ReminderSection = {
  placeId: string;
  placeName: string;
  placeIcon: PlaceIconName;
  placeColor: PlaceColor;
  data: Reminder[];
};

/**
 * Groups reminders by their associated place, for the Reminders tab
 * (issue #9). Place display fields are joined onto every `Reminder` at
 * read time (see `remindersRepository.getAllReminders`), so each section's
 * header info is derived from its first reminder. Order follows the input
 * order (reminders arrive newest-first from the repo), so the most
 * recently active place group surfaces first.
 */
export function groupRemindersByPlace(reminders: Reminder[]): ReminderSection[] {
  const sections: ReminderSection[] = [];
  const sectionByPlaceId = new Map<string, ReminderSection>();

  for (const reminder of reminders) {
    let section = sectionByPlaceId.get(reminder.placeId);
    if (!section) {
      section = {
        placeId: reminder.placeId,
        placeName: reminder.placeName,
        placeIcon: reminder.placeIcon,
        placeColor: reminder.placeColor,
        data: [],
      };
      sectionByPlaceId.set(reminder.placeId, section);
      sections.push(section);
    }
    section.data.push(reminder);
  }

  return sections;
}
