import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ItemIcon } from "@/components/ItemIcon";
import { NotificationDelayRow } from "@/components/NotificationDelayRow";
import { NotificationSection } from "@/components/NotificationSection";
import { ReminderRepeatControl } from "@/components/ReminderRepeatControl";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TipBanner } from "@/components/TipBanner";
import { TriggerOptionCard } from "@/components/TriggerOptionCard";
import { usePlacesStore } from "@/store/placesStore";
import { useReminderDelayPickStore } from "@/store/reminderDelayPickStore";
import { useRemindersStore } from "@/store/remindersStore";
import { useSettingsStore } from "@/store/settingsStore";
import { colors } from "@/theme/colors";
import type { DelayMinutes, NotificationOverride, ReminderRepeat, ReminderTrigger } from "@/types/reminder";
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
  const reminderTipDismissed = useSettingsStore((state) => state.reminderTipDismissed);
  const setReminderTipDismissed = useSettingsStore((state) => state.setReminderTipDismissed);
  const pickedDelay = useReminderDelayPickStore((state) => state.picked);
  const consumePickedDelay = useReminderDelayPickStore((state) => state.consumePicked);

  const [title, setTitle] = useState("");
  const [trigger, setTrigger] = useState<ReminderTrigger>("arrive");
  const [sound, setSound] = useState<NotificationOverride>("default");
  const [vibration, setVibration] = useState<NotificationOverride>("default");
  const [repeat, setRepeat] = useState<ReminderRepeat>("once");
  // New reminders default to Immediately (issue #100) — there's no longer a
  // global default to inherit.
  const [delayMinutes, setDelayMinutes] = useState<DelayMinutes>(0);
  const [saving, setSaving] = useState(false);

  // Apply a delay picked via the Notification Delay row when this screen
  // regains focus, mirroring `EditPlaceScreen`'s `placeLocationPickStore` use.
  useFocusEffect(
    useCallback(() => {
      if (pickedDelay === null) return;
      setDelayMinutes(pickedDelay);
      consumePickedDelay();
    }, [pickedDelay, consumePickedDelay]),
  );

  const textColor = colorScheme === "dark" ? colors.white : colors.brand;

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
        sound,
        vibration,
        repeat,
        delayMinutes,
      });
      // Refresh places so the place's reminder count reflects the new reminder.
      await hydratePlaces();
      // Leaving the Add tab resets its stack (`popToTopOnBlur`), so the next
      // `+` tap starts fresh (issue #103).
      Alert.alert("Reminder saved", `${title.trim()} has been added to your reminders.`, [
        { text: "OK", onPress: () => router.navigate("/home") },
      ]);
    } catch {
      Alert.alert("Couldn't save reminder", "Something went wrong while saving. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!place) {
    return (
      <SafeAreaView className="flex-1 bg-cream dark:bg-brand-deep" edges={["top", "left", "right"]}>
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
    <SafeAreaView className="flex-1 bg-cream dark:bg-brand-deep" edges={["top", "left", "right"]}>
      <ScreenHeader title="Add Reminder" onBack={() => router.back()} />
      <ScrollView contentContainerClassName="px-6 pt-6 pb-8" keyboardShouldPersistTaps="handled">
        {!reminderTipDismissed ? (
          <View className="mb-4">
            <TipBanner
              icon="notifications-outline"
              text="AtPlace will notify you when you arrive at the selected place."
              onDismiss={() => setReminderTipDismissed(true)}
            />
          </View>
        ) : null}

        <View className="mb-6 flex-row items-center gap-3 rounded-xl bg-white px-4 py-4 dark:bg-surfaceDark">
          <ItemIcon icon={place.icon} color={place.color} />
          <View className="flex-1">
            <Text className="text-base font-semibold text-brand dark:text-white">{place.name}</Text>
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
          className="mb-6 rounded-xl bg-white px-4 py-3 text-base text-brand dark:bg-surfaceDark dark:text-white"
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

        <ReminderRepeatControl value={repeat} onChange={setRepeat} />

        <NotificationDelayRow
          trigger={trigger}
          value={delayMinutes}
          onPress={() =>
            router.push({
              pathname: "/reminder-delay",
              params: { value: String(delayMinutes), trigger },
            })
          }
        />

        <NotificationSection
          sound={sound}
          vibration={vibration}
          onSoundChange={setSound}
          onVibrationChange={setVibration}
        />

        <Pressable
          onPress={handleSave}
          disabled={saving}
          className="items-center rounded-xl bg-brand py-4 dark:bg-brand-light"
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
