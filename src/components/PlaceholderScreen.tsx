import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View } from "react-native";

type PlaceholderScreenProps = {
  title: string;
};

/**
 * Temporary screen body used by each bottom-tab route until its real UI is
 * implemented in a later ticket. Shows a basic header/title per issue #3's
 * acceptance criteria.
 */
export function PlaceholderScreen({ title }: PlaceholderScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-brand-deep" edges={["top", "left", "right"]}>
      <View className="px-6 pt-4">
        <Text className="text-2xl font-bold text-brand dark:text-white">{title}</Text>
      </View>
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-base text-muted dark:text-mutedDark">Coming soon</Text>
      </View>
    </SafeAreaView>
  );
}
