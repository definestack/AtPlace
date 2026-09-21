import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { colors } from "@/theme/colors";

type AddPlaceOptionCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  /** Shows a spinner in place of the leading icon while an async action runs. */
  loading?: boolean;
};

/**
 * A single method card on the Add Place options screen (mockup #3), e.g.
 * "Use current location" / "Search or select on map".
 */
export function AddPlaceOptionCard({
  icon,
  title,
  subtitle,
  onPress,
  loading = false,
}: AddPlaceOptionCardProps) {
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === "dark" ? colors.brandLight : colors.brand;

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      className="flex-row items-center gap-4 rounded-xl bg-white p-4 dark:bg-surfaceDark"
    >
      <View className="h-11 w-11 items-center justify-center rounded-full bg-track dark:bg-brand">
        {loading ? (
          <ActivityIndicator color={iconColor} />
        ) : (
          <Ionicons name={icon} size={22} color={iconColor} />
        )}
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-brand dark:text-white">{title}</Text>
        <Text className="text-sm text-muted dark:text-mutedDark">{subtitle}</Text>
      </View>
    </Pressable>
  );
}
