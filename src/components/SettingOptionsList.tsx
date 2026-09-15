import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/theme/colors";

type SettingOption<T extends string> = {
  value: T;
  label: string;
};

type SettingOptionsListProps<T extends string> = {
  options: SettingOption<T>[];
  value: T;
  onSelect: (value: T) => void;
};

/**
 * Single-select list of options used by the Settings drill-in screens
 * (App Theme, Units): one row per option, with a checkmark on the active
 * value. Selecting a row applies immediately — there's no separate save step.
 */
export function SettingOptionsList<T extends string>({
  options,
  value,
  onSelect,
}: SettingOptionsListProps<T>) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View className="mt-2">
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            className="flex-row items-center justify-between px-6 py-4"
          >
            <Text
              className={
                isActive
                  ? "text-base font-semibold text-navy dark:text-white"
                  : "text-base text-navy dark:text-white"
              }
            >
              {option.label}
            </Text>
            {isActive ? (
              <Ionicons name="checkmark" size={22} color={isDark ? colors.tealLight : colors.teal} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
