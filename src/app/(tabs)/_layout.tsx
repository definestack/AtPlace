import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useColorScheme } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/theme/colors";

const TAB_BAR_VERTICAL_PADDING = 8;
const TAB_BAR_CONTENT_HEIGHT = 48;

type IconName = keyof typeof Ionicons.glyphMap;

const TAB_ICONS: Record<string, IconName> = {
  home: "home",
  map: "map",
  add: "add-circle",
  notifications: "notifications",
  settings: "settings",
};

/**
 * Bottom tab navigator for the 5 primary app sections. Each placeholder tab
 * routes to a stub screen until its real UI lands in a later ticket.
 */
export default function TabsLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: isDark ? colors.white : colors.navy,
        tabBarInactiveTintColor: isDark ? colors.mutedDark : colors.muted,
        tabBarStyle: {
          backgroundColor: isDark ? colors.surfaceDark : colors.white,
          height: TAB_BAR_CONTENT_HEIGHT + TAB_BAR_VERTICAL_PADDING + insets.bottom,
          paddingTop: TAB_BAR_VERTICAL_PADDING,
          paddingBottom: TAB_BAR_VERTICAL_PADDING + insets.bottom,
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name]} size={size} color={color} />
        ),
      })}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="map" options={{ title: "Map" }} />
      <Tabs.Screen name="add" options={{ title: "Add" }} />
      <Tabs.Screen name="notifications" options={{ title: "Notifications" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
