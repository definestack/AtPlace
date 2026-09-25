import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/theme/colors";

type TipBannerProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  text: string;
  /** When provided, renders a trailing dismiss button that calls this. */
  onDismiss?: () => void;
};

/**
 * Small dismissible contextual hint (issue #42), e.g. explaining what a
 * saved place is for, or that a reminder fires on arrival. Persistence of
 * the dismissed state is the caller's responsibility (see
 * `settingsStore`'s `placesTipDismissed` / `reminderTipDismissed`).
 */
export function TipBanner({ icon = "bulb-outline", text, onDismiss }: TipBannerProps) {
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === "dark" ? colors.mutedDark : colors.muted;

  return (
    <View className="flex-row items-start gap-3 rounded-xl bg-white p-4 dark:bg-surfaceDark">
      <Ionicons name={icon} size={20} color={iconColor} />
      <Text className="flex-1 text-sm text-muted dark:text-mutedDark">
        <Text className="font-semibold">Tip: </Text>
        {text}
      </Text>
      {onDismiss ? (
        <Pressable onPress={onDismiss} hitSlop={8}>
          <Ionicons name="close" size={18} color={iconColor} />
        </Pressable>
      ) : null}
    </View>
  );
}
