import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/theme/colors";

type ScreenHeaderProps = {
  title: string;
  /** Renders a leading back arrow (mockup screens 3-5) when provided. */
  onBack?: () => void;
};

/**
 * "AtPlace" title bar. Settings now lives in its own footer tab (not a
 * header gear icon), so this is just the title. Pushed screens (e.g. the
 * Add Place flow) pass `onBack` to show a back arrow instead.
 */
export function ScreenHeader({ title, onBack }: ScreenHeaderProps) {
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === "dark" ? colors.white : colors.brand;

  return (
    <View className="flex-row items-center px-6 pt-4">
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} className="mr-2 -ml-2 p-2">
          <Ionicons name="chevron-back" size={24} color={iconColor} />
        </Pressable>
      ) : null}
      <Text className="text-2xl font-bold text-brand dark:text-white">{title}</Text>
    </View>
  );
}
