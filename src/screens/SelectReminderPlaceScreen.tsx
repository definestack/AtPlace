import { useRouter } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PlaceRow } from "@/components/PlaceRow";
import { ScreenHeader } from "@/components/ScreenHeader";
import { usePlacesStore } from "@/store/placesStore";
import type { Place } from "@/types/place";

/**
 * First step of the Add Reminder flow (issue #8): choose which saved place
 * the new reminder belongs to. Selecting a place pushes into
 * `AddReminderScreen` (mockup #6) with `placeId` as a param.
 */
export function SelectReminderPlaceScreen() {
  const router = useRouter();
  const places = usePlacesStore((state) => state.places);

  const handleSelect = (place: Place) => {
    router.push({ pathname: "/add-reminder/details", params: { placeId: place.id } });
  };

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-brand-deep" edges={["top", "left", "right"]}>
      <ScreenHeader title="Select Place" onBack={() => router.back()} />
      <FlatList
        data={places}
        keyExtractor={(place) => place.id}
        renderItem={({ item }) => <PlaceRow place={item} onPress={handleSelect} />}
        className="flex-1"
        contentContainerClassName="pt-2"
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-8 py-12">
            <Text className="mb-4 text-center text-base text-muted dark:text-mutedDark">
              No places saved yet. Add a place before creating a reminder.
            </Text>
            <Pressable
              onPress={() => router.push("/add-place")}
              className="items-center rounded-xl bg-brand px-6 py-3"
            >
              <Text className="text-base font-semibold text-white">+ Add Place</Text>
            </Pressable>
          </View>
        }
      />
    </SafeAreaView>
  );
}
