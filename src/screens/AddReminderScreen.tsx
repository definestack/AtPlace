import { useLocalSearchParams, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ItemIcon } from "@/components/ItemIcon";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TriggerOptionCard } from "@/components/TriggerOptionCard";
import { usePlacesStore } from "@/store/placesStore";
import { useRemindersStore } from "@/store/remindersStore";
import { colors } from "@/theme/colors";
import type { ReminderTrigger } from "@/types/reminder";
import { generateId } from "@/utils/id";

/**
 * Add Reminder screen (mockup #6) — second step of the Add Reminder flow.
 * Reached from `SelectReminderPlaceScreen` with `placeId` as a param. Lets
 * the user enter reminder text and pick a trigger, then persists it (issue #8).
 */
export function AddReminderScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const params = useLocalSearchParams<{ placeId?: string }>();

  const place = usePlacesStore((state) => state.places.find((p) => p.id === params.placeId));
  const hydratePlaces = usePlacesStore((state) => state.hydrate);
  const addReminder = useRemindersStore((state) => state.addReminder);

  const [title, setTitle] = useState("");
  const [trigger, setTrigger] = useState<ReminderTrigger>("arrive");
  const [saving, setSaving] = useState(false);

  const textColor = colorScheme === "dark" ? colors.white : colors.navy;

  const handleSave = async () => {
    if (!place) {
      Alert.alert("No place selected", "Please choose a place for this reminder.");
      return;
    }
    if (!title.trim()) {
      Alert.alert("Reminder text required", "Please describe what you want to be reminded about.");
      return;
    }

    setSaving(true);
    try {
      await addReminder({
        id: generateId(),
        placeId: place.id,
        title: title.trim(),
        trigger,
        enabled: true,
      });
      // Refresh places so the place's reminder count reflects the new reminder.
      await hydratePlaces();
      Alert.alert("Reminder saved", `${title.trim()} has been added to your reminders.`, [
        { text: "OK", onPress: () => router.dismissAll() },
      ]);
    } catch {
      Alert.alert("Couldn't save reminder", "Something went wrong while saving. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!place) {
    return (
      <SafeAreaView className="flex-1 bg-cream dark:bg-navy-deep" edges={["top", "left", "right"]}>
        <ScreenHeader title="Add Reminder" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-base text-muted dark:text-mutedDark">
            That place could no longer be found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-navy-deep" edges={["top", "left", "right"]}>
      <ScreenHeader title="Add Reminder" onBack={() => router.back()} />
      <ScrollView contentContainerClassName="px-6 pt-6 pb-8" keyboardShouldPersistTaps="handled">
        <View className="mb-6 flex-row items-center gap-3 rounded-xl bg-white px-4 py-4 dark:bg-surfaceDark">
          <ItemIcon icon={place.icon} color={place.color} />
          <View className="flex-1">
            <Text className="text-base font-semibold text-navy dark:text-white">{place.name}</Text>
            {place.address ? (
              <Text className="text-sm text-muted dark:text-mutedDark">{place.address}</Text>
            ) : null}
          </View>
        </View>

        <Text className="mb-2 text-sm font-medium text-muted dark:text-mutedDark">
          What do you want to be reminded about?
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Get my laptop"
          placeholderTextColor={colorScheme === "dark" ? colors.mutedDark : colors.muted}
          className="mb-6 rounded-xl bg-white px-4 py-3 text-base text-navy dark:bg-surfaceDark dark:text-white"
          style={{ color: textColor }}
        />

        <View className="mb-8 flex-row gap-3">
          <TriggerOptionCard
            icon="notifications"
            label="When I arrive"
            description="Notify me when I reach this place"
            selected={trigger === "arrive"}
            onPress={() => setTrigger("arrive")}
          />
          <TriggerOptionCard
            icon="notifications-off"
            label="When I leave"
            description="Notify me when I leave this place"
            selected={trigger === "leave"}
            onPress={() => setTrigger("leave")}
          />
        </View>

        <Pressable
          onPress={handleSave}
          disabled={saving}
          className="items-center rounded-xl bg-navy py-4"
          style={{ opacity: saving ? 0.7 : 1 }}
        >
          <Text className="text-base font-semibold text-white">
            {saving ? "Saving…" : "Save Reminder"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
