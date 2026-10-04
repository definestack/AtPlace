import { Stack } from "expo-router";

/** Stack for the Add Reminder flow (issue #8), hosted inside the Add tab so the footer stays visible (issue #103). */
export default function AddReminderLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
