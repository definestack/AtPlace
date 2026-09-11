import { Text, View } from "react-native";

type ScreenHeaderProps = {
  title: string;
};

/**
 * "AtPlace" title bar. Settings now lives in its own footer tab (not a
 * header gear icon), so this is just the title.
 */
export function ScreenHeader({ title }: ScreenHeaderProps) {
  return (
    <View className="flex-row items-center justify-between px-6 pt-4">
      <Text className="text-2xl font-bold text-navy dark:text-white">{title}</Text>
    </View>
  );
}
