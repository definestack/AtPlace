import { Stack } from "expo-router";

/** Stack for the Add Place flow (issue #5), pushed over the tabs. */
export default function AddPlaceLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
