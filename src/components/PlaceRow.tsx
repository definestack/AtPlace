import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { Pressable, Text, View } from "react-native";

import { ItemIcon } from "@/components/ItemIcon";
import { colors } from "@/theme/colors";
import type { Place } from "@/types/place";
import { getPlaceLocationLabel } from "@/utils/placeLocation";

type PlaceRowProps = {
  place: Place;
  onPress?: (place: Place) => void;
  onDelete?: (place: Place) => void;
};

/** A single saved-place row on the Home screen's Places tab (mockup #2). */
export function PlaceRow({ place, onPress, onDelete }: PlaceRowProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const reminderLabel = `${place.reminderCount} reminder${place.reminderCount === 1 ? "" : "s"}`;

  return (
    <Pressable
      onPress={() => onPress?.(place)}
      className="flex-row items-center gap-3 px-6 py-3"
    >
      <ItemIcon icon={place.icon} color={place.color} />
      <View className="flex-1">
        <Text className="text-base font-semibold text-navy dark:text-white">{place.name}</Text>
        <Text numberOfLines={1} className="text-sm text-muted dark:text-mutedDark">
          {getPlaceLocationLabel(place)}
        </Text>
        <Text className="text-xs text-muted dark:text-mutedDark">{reminderLabel}</Text>
      </View>
      <Pressable
        onPress={() => onDelete?.(place)}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={`Delete place ${place.name}`}
      >
        <Ionicons
          name="trash-outline"
          size={20}
          color={isDark ? colors.mutedDark : colors.muted}
        />
      </Pressable>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={isDark ? colors.mutedDark : colors.muted}
      />
    </Pressable>
  );
}
