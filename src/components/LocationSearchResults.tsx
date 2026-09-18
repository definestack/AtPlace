import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import type { PlaceSearchResult } from "@/types/location";

type LocationSearchResultsProps = {
  results: PlaceSearchResult[];
  loading?: boolean;
  onSelect: (result: PlaceSearchResult) => void;
};

/** Cap so a very broad query (e.g. a city name) doesn't produce an endless list. */
const MAX_VISIBLE_RESULTS = 6;

/**
 * Floating results card on the Select Location screen (issue #30): rendered
 * over the map, directly under the search bar, listing every match for the
 * current search so the user can pick between places that share a name
 * (e.g. two "Beo Software" locations) instead of only ever landing on one.
 */
export function LocationSearchResults({
  results,
  loading = false,
  onSelect,
}: LocationSearchResultsProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const iconColor = isDark ? colors.mutedDark : colors.muted;

  return (
    <View className="mx-6 mt-2 overflow-hidden rounded-xl bg-white dark:bg-surfaceDark">
      {loading ? (
        <View className="items-center py-4">
          <ActivityIndicator color={iconColor} />
        </View>
      ) : (
        <ScrollView
          style={{ maxHeight: 280 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {results.slice(0, MAX_VISIBLE_RESULTS).map((result, index) => (
            <Pressable
              key={`${result.name}-${result.coordinates.latitude}-${result.coordinates.longitude}`}
              onPress={() => onSelect(result)}
              className={`flex-row items-center gap-3 px-4 py-3 ${
                index === 0 ? "" : "border-t border-track dark:border-navy"
              }`}
            >
              <Ionicons name="location-outline" size={20} color={iconColor} />
              <View className="flex-1">
                <Text
                  className="text-base font-semibold text-navy dark:text-white"
                  numberOfLines={1}
                >
                  {result.name}
                </Text>
                <Text className="text-sm text-muted dark:text-mutedDark" numberOfLines={1}>
                  {result.address}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
