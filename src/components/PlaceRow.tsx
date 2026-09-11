import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { ItemIcon } from "@/components/ItemIcon";
import { colors } from "@/theme/colors";
import type { Place } from "@/types/place";

type PlaceRowProps = {
  place: Place;
  onPress?: (place: Place) => void;
};

/** A single saved-place row on the Home screen's Places tab (mockup #2). */
export function PlaceRow({ place, onPress }: PlaceRowProps) {
  const reminderLabel = `${place.reminderCount} reminder${place.reminderCount === 1 ? "" : "s"}`;

  return (
    <Pressable
      onPress={() => onPress?.(place)}
      className="flex-row items-center gap-3 px-6 py-3"
    >
      <ItemIcon icon={place.icon} color={place.color} />
      <View className="flex-1">
        <Text className="text-base font-semibold text-navy">{place.name}</Text>
        <Text className="text-sm text-muted">{reminderLabel}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </Pressable>
  );
}
