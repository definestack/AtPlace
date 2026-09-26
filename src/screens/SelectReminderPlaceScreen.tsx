import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PlaceRow } from "@/components/PlaceRow";
import { ScreenHeader } from "@/components/ScreenHeader";
import { usePlacesStore } from "@/store/placesStore";
import { useReminderFlowStore } from "@/store/reminderFlowStore";
import type { Place } from "@/types/place";

/**
 * First step of the Add Reminder flow (issue #8): choose which saved place
 * the new reminder belongs to. Selecting a place pushes into
 * `AddReminderScreen` (mockup #6) with `placeId` as a param.
 *
 * Also offers "+ Add Place" (issue #58) so a place can be created without
 * leaving this flow: launching it flags `reminderFlowStore`, and when a new
 * place comes back (`createdPlaceId`), this screen auto-advances straight to
 * the reminder details step with it pre-selected.
 */
export function SelectReminderPlaceScreen() {
  const router = useRouter();
  const places = usePlacesStore((state) => state.places);
  const createdPlaceId = useReminderFlowStore((state) => state.createdPlaceId);
  const consumeCreatedPlaceId = useReminderFlowStore((state) => state.consumeCreatedPlaceId);
  const startAddPlaceForReminder = useReminderFlowStore((state) => state.startAddPlaceForReminder);

  const handleSelect = (place: Place) => {
    router.push({ pathname: "/add-reminder/details", params: { placeId: place.id } });
  };

  const handleAddPlace = () => {
    startAddPlaceForReminder();
    router.push("/add-place");
  };

  useFocusEffect(
    useCallback(() => {
      if (!createdPlaceId) return;
      // Consume before pushing so backing out of details to this picker
      // doesn't re-trigger the advance.
      consumeCreatedPlaceId();
      router.push({ pathname: "/add-reminder/details", params: { placeId: createdPlaceId } });
    }, [createdPlaceId, consumeCreatedPlaceId, router]),
  );

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
              onPress={handleAddPlace}
              className="items-center rounded-xl bg-brand px-6 py-3 dark:bg-brand-light"
            >
              <Text className="text-base font-semibold text-white">+ Add Place</Text>
            </Pressable>
          </View>
        }
      />
      {places.length > 0 ? (
        <Pressable
          onPress={handleAddPlace}
          className="mx-6 mb-4 items-center rounded-xl bg-brand py-4 dark:bg-brand-light"
        >
          <Text className="text-base font-semibold text-white">+ Add Place</Text>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}
