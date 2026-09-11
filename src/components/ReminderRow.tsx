import { Switch, Text, View } from "react-native";

import { ItemIcon } from "@/components/ItemIcon";
import { colors } from "@/theme/colors";
import type { Reminder } from "@/types/reminder";

type ReminderRowProps = {
  reminder: Reminder;
  onToggle?: (id: string, enabled: boolean) => void;
};

const TRIGGER_LABEL: Record<Reminder["trigger"], string> = {
  arrive: "When I arrive",
  leave: "When I leave",
};

/** A single reminder row on the Home screen's Reminders tab (mockup #7). */
export function ReminderRow({ reminder, onToggle }: ReminderRowProps) {
  return (
    <View className="flex-row items-center gap-3 px-6 py-3">
      <ItemIcon icon={reminder.placeIcon} color={reminder.placeColor} />
      <View className="flex-1">
        <Text className="text-base font-semibold text-navy">{reminder.title}</Text>
        <Text className="text-sm text-muted">
          At {reminder.placeName} • {TRIGGER_LABEL[reminder.trigger]}
        </Text>
      </View>
      <Switch
        value={reminder.enabled}
        onValueChange={(next) => onToggle?.(reminder.id, next)}
        trackColor={{ false: colors.track, true: colors.teal }}
        thumbColor={colors.white}
      />
    </View>
  );
}
