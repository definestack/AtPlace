import { Text, View } from "react-native";

type ReminderSectionHeaderProps = {
  title: string;
};

/**
 * Place-name header for a group of reminders on the Home screen's
 * Reminders tab (issue #9). No mockup covers grouped reminders, so this
 * follows the app's existing quiet-label styling rather than introducing a
 * new visual pattern.
 */
export function ReminderSectionHeader({ title }: ReminderSectionHeaderProps) {
  return (
    <View className="bg-cream px-6 pt-4 pb-1 dark:bg-navy-deep">
      <Text className="text-sm font-semibold text-muted dark:text-mutedDark">{title}</Text>
    </View>
  );
}
