import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/theme/colors";

type ScreenHeaderProps = {
  title: string;
  onSettingsPress?: () => void;
};

/**
 * "AtPlace" title bar with a settings gear, per mockup #2. Settings screen
 * lands in a later ticket, so `onSettingsPress` defaults to a no-op.
 */
export function ScreenHeader({ title, onSettingsPress }: ScreenHeaderProps) {
  return (
    <View className="flex-row items-center justify-between px-6 pt-4">
      <Text className="text-2xl font-bold text-navy">{title}</Text>
      <Pressable
        onPress={onSettingsPress}
        hitSlop={8}
        className="h-10 w-10 items-center justify-center"
      >
        <Ionicons name="settings-outline" size={22} color={colors.navy} />
      </Pressable>
    </View>
  );
}
