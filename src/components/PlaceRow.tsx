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
  onEdit?: (place: Place) => void;
  onDelete?: (place: Place) => void;
};

/**
 * A single saved-place row (mockup #2), shared by the Home screen's Places
 * tab and the Add Reminder flow's Select Place screen. Row actions are
 * opt-in (issue #90): the Edit/Delete icons only render when `onEdit`/
 * `onDelete` are passed, so Select Place — which only wires up `onPress` —
 * shows a plain, pick-only row with no leftover gap where the icons would
 * have been.
 */
export function PlaceRow({ place, onPress, onEdit, onDelete }: PlaceRowProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const reminderLabel = `${place.reminderCount} reminder${place.reminderCount === 1 ? "" : "s"}`;

  return (
    <Pressable
      onPress={() => onPress?.(place)}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? place.name : undefined}
      className="flex-row items-center gap-3 px-6 py-3"
    >
      <ItemIcon icon={place.icon} color={place.color} />
      <View className="flex-1">
        <Text className="text-base font-semibold text-brand dark:text-white">{place.name}</Text>
        <Text numberOfLines={1} className="text-sm text-muted dark:text-mutedDark">
          {getPlaceLocationLabel(place)}
        </Text>
        <Text className="text-xs text-muted dark:text-mutedDark">{reminderLabel}</Text>
      </View>
      {onEdit ? (
        <Pressable
          onPress={() => onEdit(place)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={`Edit place ${place.name}`}
        >
          <Ionicons
            name="create-outline"
            size={20}
            color={isDark ? colors.mutedDark : colors.muted}
          />
        </Pressable>
      ) : null}
      {onDelete ? (
        <Pressable
          onPress={() => onDelete(place)}
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
      ) : null}
    </Pressable>
  );
}
