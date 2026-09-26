import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { NotificationOverrideControl } from "@/components/NotificationOverrideControl";
import { colors } from "@/theme/colors";
import type { NotificationOverride } from "@/types/reminder";
import { describeNotificationSummary } from "@/utils/notificationPrefs";

type NotificationSectionProps = {
  sound: NotificationOverride;
  vibration: NotificationOverride;
  onSoundChange: (value: NotificationOverride) => void;
  onVibrationChange: (value: NotificationOverride) => void;
};

/**
 * Collapsible "Notification" summary section for the Add/Edit Reminder
 * screens (issue #59). Replaces two always-visible Sound/Vibration pill
 * controls with a single compact, visually-secondary row that summarizes the
 * current overrides; tapping it expands the same controls in place.
 */
export function NotificationSection({
  sound,
  vibration,
  onSoundChange,
  onVibrationChange,
}: NotificationSectionProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const iconColor = isDark ? colors.mutedDark : colors.muted;
  const [expanded, setExpanded] = useState(false);

  return (
    <View className="mb-8 rounded-xl bg-white dark:bg-surfaceDark">
      <Pressable
        onPress={() => setExpanded((value) => !value)}
        className="flex-row items-center gap-3 px-4 py-4"
      >
        <Ionicons name="notifications-outline" size={22} color={iconColor} />
        <View className="flex-1">
          <Text className="text-base font-medium text-brand dark:text-white">Notification</Text>
          <Text className="text-sm text-muted dark:text-mutedDark">
            {describeNotificationSummary(sound, vibration)}
          </Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={iconColor} />
      </Pressable>

      {expanded ? (
        <View className="px-4 pb-4">
          <NotificationOverrideControl label="Sound" value={sound} onChange={onSoundChange} />
          <NotificationOverrideControl
            label="Vibration"
            value={vibration}
            onChange={onVibrationChange}
          />
        </View>
      ) : null}
    </View>
  );
}
