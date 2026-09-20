import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { Pressable, Switch, Text, View } from "react-native";

import { ItemIcon } from "@/components/ItemIcon";
import { colors } from "@/theme/colors";
import type { Reminder } from "@/types/reminder";

type ReminderRowProps = {
  reminder: Reminder;
  onToggle?: (id: string, enabled: boolean) => void;
  onDelete?: (id: string) => void;
};

const TRIGGER_LABEL: Record<Reminder["trigger"], string> = {
  arrive: "When I arrive",
  leave: "When I leave",
};

/** A single reminder row on the Home screen's Reminders tab (mockup #7). */
export function ReminderRow({ reminder, onToggle, onDelete }: ReminderRowProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View className="flex-row items-center gap-3 px-6 py-3">
      <ItemIcon icon={reminder.placeIcon} color={reminder.placeColor} />
      <View className="flex-1">
        <Text className="text-base font-semibold text-brand dark:text-white">
          {reminder.title}
        </Text>
        <Text className="text-sm text-muted dark:text-mutedDark">
          At {reminder.placeName} • {TRIGGER_LABEL[reminder.trigger]}
        </Text>
      </View>
      <Pressable
        onPress={() => onDelete?.(reminder.id)}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={`Delete reminder ${reminder.title}`}
      >
        <Ionicons
          name="trash-outline"
          size={20}
          color={isDark ? colors.mutedDark : colors.muted}
        />
      </Pressable>
      <Switch
        value={reminder.enabled}
        onValueChange={(next) => onToggle?.(reminder.id, next)}
        trackColor={{ false: isDark ? colors.surfaceDark : colors.track, true: colors.brand }}
        thumbColor={colors.white}
      />
    </View>
  );
}
