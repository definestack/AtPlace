import type { Place } from "@/types/place";
import type { Reminder } from "@/types/reminder";

/**
 * Placeholder data for the Home screen (issue #4), matching
 * docs/design/overall-design.png mockups #2 (Saved Places) and #7
 * (Reminders List). Replace with a real store/DB in a later ticket.
 */
export const mockPlaces: Place[] = [
  { id: "home", name: "Home", icon: "home", color: "teal", reminderCount: 3 },
  { id: "work", name: "Work", icon: "briefcase", color: "teal", reminderCount: 2 },
  { id: "gym", name: "Gym", icon: "barbell", color: "plum", reminderCount: 1 },
  { id: "supermarket", name: "Supermarket", icon: "cart", color: "mint", reminderCount: 1 },
  { id: "pharmacy", name: "Pharmacy", icon: "medkit", color: "coral", reminderCount: 1 },
];

export const mockReminders: Reminder[] = [
  {
    id: "get-laptop",
    title: "Get my laptop",
    placeName: "Work",
    placeIcon: "briefcase",
    placeColor: "teal",
    trigger: "arrive",
    enabled: true,
  },
  {
    id: "buy-milk",
    title: "Buy milk",
    placeName: "Supermarket",
    placeIcon: "cart",
    placeColor: "mint",
    trigger: "arrive",
    enabled: true,
  },
  {
    id: "take-medicine",
    title: "Take medicine",
    placeName: "Home",
    placeIcon: "home",
    placeColor: "teal",
    trigger: "arrive",
    enabled: true,
  },
  {
    id: "workout-clothes",
    title: "Workout clothes",
    placeName: "Gym",
    placeIcon: "barbell",
    placeColor: "plum",
    trigger: "arrive",
    enabled: false,
  },
];
