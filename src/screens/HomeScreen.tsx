import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PlaceRow } from "@/components/PlaceRow";
import { ReminderRow } from "@/components/ReminderRow";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { mockPlaces, mockReminders } from "@/data/mockData";

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
 * #2 (Saved Places) and #7 (Reminders List). Reads from mock data for now —
 * a real store/DB lands in a later ticket.
 */
export function HomeScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<HomeTab>("places");
  const [reminders, setReminders] = useState(mockReminders);

  const toggleReminder = (id: string, enabled: boolean) => {
    setReminders((current) => current.map((r) => (r.id === id ? { ...r, enabled } : r)));
  };

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-navy-deep" edges={["top", "left", "right"]}>
      <ScreenHeader title="AtPlace" />
      <SegmentedTabs options={TAB_OPTIONS} value={tab} onChange={setTab} />

      {tab === "places" ? (
        <>
          <FlatList
            data={mockPlaces}
            keyExtractor={(place) => place.id}
            renderItem={({ item }) => <PlaceRow place={item} />}
            className="flex-1"
            contentContainerClassName="pt-2"
          />
          <Pressable
            onPress={() => router.push("/add-place")}
            className="mx-6 mb-4 items-center rounded-xl bg-navy py-4"
          >
            <Text className="text-base font-semibold text-white">+ Add Place</Text>
          </Pressable>
        </>
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={(reminder) => reminder.id}
          renderItem={({ item }) => <ReminderRow reminder={item} onToggle={toggleReminder} />}
          contentContainerClassName="pt-2"
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-8 py-12">
              <Text className="text-center text-base text-muted dark:text-mutedDark">
                No reminders yet
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
