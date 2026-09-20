import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { Pressable, Switch, Text, View } from "react-native";

import { colors } from "@/theme/colors";

type IconName = keyof typeof Ionicons.glyphMap;

type SettingsRowProps = {
  icon: IconName;
  label: string;
  /** Current-value line shown under the label (e.g. "Kilometres (km)"). */
  subtitle?: string;
  onPress?: () => void;
} & (
  | { toggle?: undefined }
  | { toggle: { value: boolean; onValueChange: (value: boolean) => void } }
);

/**
 * A single row on the Settings screen (mockup #10): leading icon, label +
 * optional current-value subtitle, and a trailing chevron for drill-in rows
 * or a `Switch` for the Notifications toggle. Mirrors the row layout used by
 * `PlaceRow`/`ReminderRow`.
 */
export function SettingsRow({ icon, label, subtitle, onPress, toggle }: SettingsRowProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const iconColor = isDark ? colors.mutedDark : colors.muted;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center gap-3 px-6 py-3"
    >
      <Ionicons name={icon} size={22} color={iconColor} />
      <View className="flex-1">
        <Text className="text-base font-medium text-brand dark:text-white">{label}</Text>
        {subtitle ? (
          <Text className="text-sm text-muted dark:text-mutedDark">{subtitle}</Text>
        ) : null}
      </View>
      {toggle ? (
        <Switch
          value={toggle.value}
          onValueChange={toggle.onValueChange}
          trackColor={{ false: isDark ? colors.surfaceDark : colors.track, true: colors.brand }}
          thumbColor={colors.white}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={iconColor} />
      )}
    </Pressable>
  );
}
