import { Stack } from "expo-router";

/** Stack for the Add Reminder flow (issue #8), pushed over the tabs. */
export default function AddReminderLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
