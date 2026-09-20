import { Pressable, Text, View } from "react-native";

export type SegmentedTabsOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedTabsProps<T extends string> = {
  options: [SegmentedTabsOption<T>, SegmentedTabsOption<T>];
  value: T;
  onChange: (value: T) => void;
};

/**
 * Two-segment pill toggle (e.g. Places / Reminders on mockup #2, #7):
 * light track with a white active pill and brand active text.
 */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
}: SegmentedTabsProps<T>) {
  return (
    <View className="mx-6 mt-4 flex-row rounded-xl bg-track p-1 dark:bg-surfaceDark">
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className={`flex-1 items-center rounded-lg py-2 ${
              isActive ? "bg-white dark:bg-brand" : ""
            }`}
          >
            <Text
              className={
                isActive
                  ? "font-semibold text-brand dark:text-white"
                  : "text-muted dark:text-mutedDark"
              }
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
