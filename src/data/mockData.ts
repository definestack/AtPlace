import type { Reminder } from "@/types/reminder";

/**
 * Placeholder data for the Home screen's Reminders tab (issue #4), matching
 * docs/design/overall-design.png mockup #7 (Reminders List). Saved Places
 * (mockup #2) now come from `usePlacesStore` / SQLite (issue #7) instead of
 * mock data — reminders still need their own store/DB in a later ticket.
 */
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
