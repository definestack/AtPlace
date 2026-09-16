import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, SectionList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PlaceRow } from "@/components/PlaceRow";
import { ReminderRow } from "@/components/ReminderRow";
import { ReminderSectionHeader } from "@/components/ReminderSectionHeader";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { usePlacesStore } from "@/store/placesStore";
import { useRemindersStore } from "@/store/remindersStore";
import { groupRemindersByPlace } from "@/utils/groupReminders";

type HomeTab = "places" | "reminders";

const TAB_OPTIONS: [
  { value: HomeTab; label: string },
  { value: HomeTab; label: string },
] = [
  { value: "places", label: "Places" },
  { value: "reminders", label: "Reminders" },
];

/**
 * Home screen (issue #4): saved places / reminders hub, matching mockups
 * #2 (Saved Places) and #7 (Reminders List). Places are read from
 * `usePlacesStore` (SQLite-backed, issue #7); reminders are read from
 * `useRemindersStore` (SQLite-backed, issue #8).
 */
export function HomeScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<HomeTab>("places");
  const places = usePlacesStore((state) => state.places);
  const hydratePlaces = usePlacesStore((state) => state.hydrate);
  const reminders = useRemindersStore((state) => state.reminders);
  const setReminderEnabled = useRemindersStore((state) => state.setEnabled);
  const deleteReminder = useRemindersStore((state) => state.deleteReminder);
  const reminderSections = useMemo(() => groupRemindersByPlace(reminders), [reminders]);

  const toggleReminder = (id: string, enabled: boolean) => {
    setReminderEnabled(id, enabled);
  };

  const confirmDeleteReminder = async (id: string) => {
    try {
      await deleteReminder(id);
      await hydratePlaces();
    } catch {
      Alert.alert("Something went wrong", "The reminder couldn't be deleted. Please try again.");
    }
  };

  const handleDeleteReminder = (id: string) => {
    Alert.alert(
      "Delete reminder?",
      "This reminder will be permanently removed. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => confirmDeleteReminder(id) },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-navy-deep" edges={["top", "left", "right"]}>
      <ScreenHeader title="AtPlace" />
      <SegmentedTabs options={TAB_OPTIONS} value={tab} onChange={setTab} />

      {tab === "places" ? (
        <>
          <FlatList
            data={places}
            keyExtractor={(place) => place.id}
            renderItem={({ item }) => <PlaceRow place={item} />}
            className="flex-1"
            contentContainerClassName="pt-2"
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center px-8 py-12">
                <Text className="text-center text-base text-muted dark:text-mutedDark">
                  No places saved yet
                </Text>
              </View>
            }
          />
          <Pressable
            onPress={() => router.push("/add-place")}
            className="mx-6 mb-4 items-center rounded-xl bg-navy py-4"
          >
            <Text className="text-base font-semibold text-white">+ Add Place</Text>
          </Pressable>
        </>
      ) : (
        <>
          <SectionList
            sections={reminderSections}
            keyExtractor={(reminder) => reminder.id}
            renderItem={({ item }) => (
              <ReminderRow reminder={item} onToggle={toggleReminder} onDelete={handleDeleteReminder} />
            )}
            renderSectionHeader={({ section }) => (
              <ReminderSectionHeader title={section.placeName} />
            )}
            className="flex-1"
            contentContainerClassName="pt-2"
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center px-8 py-12">
                <Text className="text-center text-base text-muted dark:text-mutedDark">
                  No reminders yet
                </Text>
              </View>
            }
          />
          <Pressable
            onPress={() => router.push("/add-reminder")}
            className="mx-6 mb-4 items-center rounded-xl bg-navy py-4"
          >
            <Text className="text-base font-semibold text-white">+ Add Reminder</Text>
          </Pressable>
        </>
      )}
    </SafeAreaView>
  );
}
