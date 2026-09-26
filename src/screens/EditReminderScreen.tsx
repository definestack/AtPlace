import { useLocalSearchParams, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ItemIcon } from "@/components/ItemIcon";
import { NotificationOverrideControl } from "@/components/NotificationOverrideControl";
import { ReminderRepeatControl } from "@/components/ReminderRepeatControl";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TriggerOptionCard } from "@/components/TriggerOptionCard";
import { usePlacesStore } from "@/store/placesStore";
import { useRemindersStore } from "@/store/remindersStore";
import { colors } from "@/theme/colors";
import type { NotificationOverride, ReminderRepeat, ReminderTrigger } from "@/types/reminder";

/**
 * Edit Reminder screen (issue #51) — reached by tapping a reminder on the
 * Home screen's Reminders tab. Lets the user change the reminder text,
 * trigger, and per-reminder Sound/Vibration overrides. Mirrors
 * `AddReminderScreen`'s layout and validation, but updates an existing
 * reminder instead of creating one.
 */
export function EditReminderScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const params = useLocalSearchParams<{ reminderId?: string }>();

  const reminder = useRemindersStore((state) =>
    state.reminders.find((r) => r.id === params.reminderId),
  );
  const updateReminder = useRemindersStore((state) => state.updateReminder);
  // Only used for the place's address line — the reminder itself already
  // carries placeName/placeIcon/placeColor via the repository join.
  const place = usePlacesStore((state) => state.places.find((p) => p.id === reminder?.placeId));

  const [title, setTitle] = useState(reminder?.title ?? "");
  const [trigger, setTrigger] = useState<ReminderTrigger>(reminder?.trigger ?? "arrive");
  const [sound, setSound] = useState<NotificationOverride>(reminder?.sound ?? "default");
  const [vibration, setVibration] = useState<NotificationOverride>(
    reminder?.vibration ?? "default",
  );
  const [repeat, setRepeat] = useState<ReminderRepeat>(reminder?.repeat ?? "once");
  const [saving, setSaving] = useState(false);

  const textColor = colorScheme === "dark" ? colors.white : colors.brand;

  const handleSave = async () => {
    if (!reminder) return;
    if (!title.trim()) {
      Alert.alert("Reminder text required", "Please describe what you want to be reminded about.");
      return;
    }

    setSaving(true);
    try {
      await updateReminder({ ...reminder, title: title.trim(), trigger, sound, vibration, repeat });
      router.back();
    } catch {
      Alert.alert("Couldn't save reminder", "Something went wrong while saving. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!reminder) {
    return (
      <SafeAreaView className="flex-1 bg-cream dark:bg-brand-deep" edges={["top", "left", "right"]}>
        <ScreenHeader title="Edit Reminder" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-base text-muted dark:text-mutedDark">
            That reminder could no longer be found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-brand-deep" edges={["top", "left", "right"]}>
      <ScreenHeader title="Edit Reminder" onBack={() => router.back()} />
      <ScrollView contentContainerClassName="px-6 pt-6 pb-8" keyboardShouldPersistTaps="handled">
        <View className="mb-6 flex-row items-center gap-3 rounded-xl bg-white px-4 py-4 dark:bg-surfaceDark">
          <ItemIcon icon={reminder.placeIcon} color={reminder.placeColor} />
          <View className="flex-1">
            <Text className="text-base font-semibold text-brand dark:text-white">
              {reminder.placeName}
            </Text>
            {place?.address ? (
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

        <NotificationOverrideControl label="Sound" value={sound} onChange={setSound} />
        <NotificationOverrideControl label="Vibration" value={vibration} onChange={setVibration} />

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
