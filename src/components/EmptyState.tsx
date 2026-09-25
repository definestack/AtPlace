import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/theme/colors";

type EmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
};

/**
 * Reusable empty-state block (icon + title + subtitle + optional CTA), used
 * for first-use guidance and empty lists across Home's Places/Reminders tabs
 * (issue #42). Consolidates the hand-rolled pattern previously duplicated in
 * `NotificationsScreen` and `SelectReminderPlaceScreen`.
 */
export function EmptyState({ icon, title, subtitle, ctaLabel, onCtaPress }: EmptyStateProps) {
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === "dark" ? colors.mutedDark : colors.muted;

  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <Ionicons name={icon} size={40} color={iconColor} />
      <Text className="mt-4 text-center text-lg font-semibold text-brand dark:text-white">
        {title}
      </Text>
      <Text className="mt-1 text-center text-base text-muted dark:text-mutedDark">{subtitle}</Text>
      {ctaLabel && onCtaPress ? (
        <Pressable
          onPress={onCtaPress}
          className="mt-6 items-center rounded-xl bg-brand px-6 py-3 dark:bg-brand-light"
        >
          <Text className="text-base font-semibold text-white">{ctaLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
