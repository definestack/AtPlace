import { Pressable, Text, View } from "react-native";

import type { NotificationOverride } from "@/types/reminder";

const OPTIONS: { value: NotificationOverride; label: string }[] = [
  { value: "default", label: "Use Default" },
  { value: "on", label: "On" },
  { value: "off", label: "Off" },
];

type NotificationOverrideControlProps = {
  label: string;
  value: NotificationOverride;
  onChange: (value: NotificationOverride) => void;
};

/**
 * Tri-state Use Default / On / Off selector for a reminder's Sound or
 * Vibration setting (issue #51). "Use Default" inherits the global Settings
 * > Notifications value; "On"/"Off" explicitly override it. Styled as a
 * 3-segment pill, matching `SegmentedTabs`'s look.
 */
export function NotificationOverrideControl({
  label,
  value,
  onChange,
}: NotificationOverrideControlProps) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-medium text-muted dark:text-mutedDark">{label}</Text>
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
