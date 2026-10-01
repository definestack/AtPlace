import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/theme/colors";
import type { Place } from "@/types/place";

type SearchedPlaceCardProps = {
  name: string;
  address?: string;
  /** Set when this location matches an already-saved place (issue #86) —
   * shown instead of the Save action to avoid offering a duplicate save. */
  savedPlace?: Place;
  onSave: () => void;
  onDismiss: () => void;
};

/**
 * Card shown over the Map (issue #86) after picking a search result. Mirrors
 * `SelectedPlaceCard`'s bottom-sheet styling, but floats over the map rather
 * than docking to the screen bottom, has no editable name, and swaps the
 * Save action for an "already saved" notice when the searched coordinates
 * match an existing place.
 */
export function SearchedPlaceCard({
  name,
  address,
  savedPlace,
  onSave,
  onDismiss,
}: SearchedPlaceCardProps) {
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const mutedColor = colorScheme === "dark" ? colors.mutedDark : colors.muted;

  const displayName = savedPlace?.name ?? name;
  const displayAddress = savedPlace?.address ?? address;

  return (
    <View
      className="absolute inset-x-4 rounded-2xl bg-white px-5 py-4 shadow-lg dark:bg-surfaceDark"
      style={{ bottom: insets.bottom + 16 }}
    >
      <View className="flex-row items-start gap-3">
        <View className="flex-1">
          <Text className="text-base font-bold text-brand dark:text-white" numberOfLines={1}>
            {displayName}
          </Text>
          {displayAddress ? (
            <Text className="mt-1 text-sm text-muted dark:text-mutedDark" numberOfLines={2}>
              {displayAddress}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={onDismiss}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Dismiss search result"
          className="h-11 w-11 items-center justify-center rounded-full"
        >
          <Ionicons name="close" size={22} color={mutedColor} />
        </Pressable>
      </View>

      {savedPlace ? (
        <View className="mt-3 flex-row items-center gap-2">
          <Ionicons name="checkmark-circle" size={20} color={colors.teal} />
          <Text className="flex-1 text-sm font-medium text-teal" numberOfLines={1}>
            Already saved as {savedPlace.name}
          </Text>
        </View>
      ) : (
        <Pressable
          onPress={onSave}
          accessibilityRole="button"
          accessibilityLabel={`Save ${name} as a place`}
          className="mt-3 items-center rounded-xl bg-brand py-4 dark:bg-brand-light"
        >
          <Text className="text-base font-semibold text-white">Save place</Text>
        </Pressable>
      )}
    </View>
  );
}
