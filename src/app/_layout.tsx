import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { usePlacesStore } from "@/store/placesStore";
import { useRemindersStore } from "@/store/remindersStore";
import { useThemeStore } from "@/store/themeStore";

export default function RootLayout() {
  const { setColorScheme, colorScheme } = useColorScheme();
  const mode = useThemeStore((state) => state.mode);
  const hydrate = useThemeStore((state) => state.hydrate);
  const hydratePlaces = usePlacesStore((state) => state.hydrate);
  const hydrateReminders = useRemindersStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
    hydratePlaces();
    hydrateReminders();
  }, [hydrate, hydratePlaces, hydrateReminders]);

  useEffect(() => {
    setColorScheme(mode);
  }, [mode, setColorScheme]);

  return (
    <SafeAreaProvider>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
