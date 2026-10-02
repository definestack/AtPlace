import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import type { DelayMinutes, ReminderTrigger } from "@/types/reminder";
import { delayHelpText, delayLabel } from "@/utils/delay";

type NotificationDelayRowProps = {
  trigger: ReminderTrigger;
  value: DelayMinutes;
  onPress: () => void;
};

/**
 * Notification Delay row on Add/Edit Reminder (issue #100) — a drill-in that
 * pushes `/reminder-delay` and reads the pick back via
 * `reminderDelayPickStore`. Styled as a white rounded card to match the place
 * card above it, with a chevron like `SettingsRow`'s drill-in rows. The
 * helper caption below reflects both the current trigger and delay, per the
 * issue's acceptance criteria (e.g. "Notify 3 min after arriving").
 */
export function NotificationDelayRow({ trigger, value, onPress }: NotificationDelayRowProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const chevronColor = isDark ? colors.mutedDark : colors.muted;

  return (
    <View className="mb-4">
      <Pressable
        onPress={onPress}
        className="flex-row items-center justify-between rounded-xl bg-white px-4 py-4 dark:bg-surfaceDark"
      >
        <Text className="text-base font-medium text-brand dark:text-white">Notification Delay</Text>
        <View className="flex-row items-center gap-1">
          <Text className="text-sm text-muted dark:text-mutedDark">{delayLabel(value)}</Text>
          <Ionicons name="chevron-forward" size={20} color={chevronColor} />
        </View>
      </Pressable>
      <Text className="mt-2 text-sm text-muted dark:text-mutedDark">{delayHelpText(trigger, value)}</Text>
    </View>
  );
}
