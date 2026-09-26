import { Pressable, Text, View } from "react-native";

import type { ReminderRepeat } from "@/types/reminder";

const OPTIONS: { value: ReminderRepeat; label: string }[] = [
  { value: "once", label: "One-time" },
  { value: "repeating", label: "Repeating" },
];

type ReminderRepeatControlProps = {
  value: ReminderRepeat;
  onChange: (value: ReminderRepeat) => void;
};

/**
 * Two-state One-time / Repeating selector for a reminder (issue #53).
 * One-time reminders go inactive after they fire once; repeating reminders
 * keep firing every time their trigger condition is met. Styled as a
 * 2-segment pill, matching `NotificationOverrideControl`.
 */
export function ReminderRepeatControl({ value, onChange }: ReminderRepeatControlProps) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-medium text-muted dark:text-mutedDark">Repeat</Text>
      <View className="flex-row rounded-xl bg-track p-1 dark:bg-surfaceDark">
        {OPTIONS.map((option) => {
          const isActive = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              className={`flex-1 items-center rounded-lg py-2 ${
                isActive ? "bg-white dark:bg-brand-light" : ""
              }`}
            >
              <Text
                className={
                  isActive
                    ? "text-sm font-semibold text-brand dark:text-white"
                    : "text-sm text-muted dark:text-mutedDark"
                }
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
