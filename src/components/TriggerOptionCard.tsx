import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { Pressable, Text } from "react-native";

import { colors } from "@/theme/colors";

type TriggerOptionCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  selected: boolean;
  onPress: () => void;
};

/**
 * One of the two selectable trigger cards on the Add Reminder screen
 * (mockup #6): "When I arrive" / "When I leave". Selected state is shown
 * with a brand border + tinted background.
 */
export function TriggerOptionCard({
  icon,
  label,
  description,
  selected,
  onPress,
}: TriggerOptionCardProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const unselectedColor = isDark ? colors.mutedDark : colors.muted;
  const selectedColor = isDark ? colors.brandLight : colors.brand;
  const iconColor = selected ? selectedColor : unselectedColor;

  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 rounded-xl border-2 px-4 py-4 ${
        selected
          ? "border-brand bg-brand/10 dark:border-brand-light dark:bg-brand-light/10"
          : "border-transparent bg-white dark:bg-surfaceDark"
      }`}
    >
      <Ionicons name={icon} size={24} color={iconColor} />
      <Text
        className={`mt-2 text-base font-semibold ${
          selected ? "text-brand dark:text-brand-light" : "text-brand dark:text-white"
        }`}
      >
        {label}
      </Text>
      <Text className="mt-1 text-sm text-muted dark:text-mutedDark">{description}</Text>
    </Pressable>
  );
}
