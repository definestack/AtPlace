import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { SettingOptionsList } from "@/components/SettingOptionsList";
import { useReminderDelayPickStore } from "@/store/reminderDelayPickStore";
import { DELAY_OPTIONS_MINUTES, type DelayMinutes, type ReminderTrigger } from "@/types/reminder";
import { delayLabel, parseDelayMinutes } from "@/utils/delay";

const DELAY_OPTIONS: { value: DelayMinutes; label: string }[] = DELAY_OPTIONS_MINUTES.map(
  (minutes) => ({ value: minutes, label: delayLabel(minutes) }),
);

const HELPER_TEXT: Record<ReminderTrigger, string> = {
  arrive:
    "Wait this long after arriving before notifying. Helps ignore driving past without stopping.",
  leave:
    "Wait this long after leaving before notifying. Helps ignore a brief step outside (leave reminders also require a 1 min minimum stay).",
};

/**
 * Notification Delay drill-in (issue #100) — reached from the Add/Edit
 * Reminder screen's Notification Delay row. Driving through a saved place
 * fires both an ENTER and an EXIT geofence transition in quick succession;
 * delaying the notification and cancelling it if the opposite transition
 * follows shortly after (see `services/geofencing.ts`) tells that apart from
 * a genuine stay. The delay now lives on each reminder rather than as a
 * global setting, so this screen hands its pick back to whichever of
 * Add/Edit Reminder pushed it via `reminderDelayPickStore`, instead of
 * writing straight to `settingsStore` the way the old global Arrival/Leave
 * Delay screens did.
 */
export function ReminderDelayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ value?: string; trigger?: string }>();
  const setPicked = useReminderDelayPickStore((state) => state.setPicked);

  const value = parseDelayMinutes(params.value) ?? 0;
  const trigger: ReminderTrigger = params.trigger === "leave" ? "leave" : "arrive";

  const handleSelect = (minutes: DelayMinutes) => {
    setPicked(minutes);
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-brand-deep" edges={["top", "left", "right"]}>
      <ScreenHeader title="Notification Delay" onBack={() => router.back()} />
      <Text className="px-6 pt-2 text-sm text-muted dark:text-mutedDark">{HELPER_TEXT[trigger]}</Text>
      <View className="mt-2">
        <SettingOptionsList options={DELAY_OPTIONS} value={value} onSelect={handleSelect} />
      </View>
    </SafeAreaView>
  );
}
