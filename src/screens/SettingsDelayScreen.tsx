import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { SettingOptionsList } from "@/components/SettingOptionsList";
import {
  DELAY_OPTIONS_MINUTES,
  useSettingsStore,
  type DelayMinutes,
} from "@/store/settingsStore";

type SettingsDelayScreenProps = {
  kind: "arrival" | "leave";
};

const COPY: Record<
  SettingsDelayScreenProps["kind"],
  { title: string; helper: string }
> = {
  arrival: {
    title: "Arrival Delay",
    helper:
      "Wait this long inside a place before sending an arrival reminder. Helps ignore driving past without stopping.",
  },
  leave: {
    title: "Leave Delay",
    helper:
      "Wait this long outside a place before sending a leave reminder. Helps ignore a brief step outside.",
  },
};

function delayLabel(minutes: DelayMinutes): string {
  if (minutes === 0) return "Immediately";
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

const DELAY_OPTIONS: { value: DelayMinutes; label: string }[] = DELAY_OPTIONS_MINUTES.map(
  (minutes) => ({ value: minutes, label: delayLabel(minutes) }),
);

/**
 * Arrival Delay / Leave Delay drill-in (Settings > Notifications > Arrival
 * Delay|Leave Delay). Driving through a saved place fires both an ENTER and
 * an EXIT geofence transition in quick succession; delaying the notification
 * and cancelling it if the opposite transition follows shortly after (see
 * `services/geofencing.ts`) tells that apart from a genuine stay. The two
 * delays are configured separately, matching the two independent geofence
 * transitions they gate. Selecting a value persists immediately via
 * `settingsStore` — no separate save step.
 */
export function SettingsDelayScreen({ kind }: SettingsDelayScreenProps) {
  const router = useRouter();
  const arrivalDelayMinutes = useSettingsStore((state) => state.arrivalDelayMinutes);
  const setArrivalDelayMinutes = useSettingsStore((state) => state.setArrivalDelayMinutes);
  const leaveDelayMinutes = useSettingsStore((state) => state.leaveDelayMinutes);
  const setLeaveDelayMinutes = useSettingsStore((state) => state.setLeaveDelayMinutes);

  const value = kind === "arrival" ? arrivalDelayMinutes : leaveDelayMinutes;
  const onSelect = kind === "arrival" ? setArrivalDelayMinutes : setLeaveDelayMinutes;
  const { title, helper } = COPY[kind];

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-brand-deep" edges={["top", "left", "right"]}>
      <ScreenHeader title={title} onBack={() => router.back()} />
      <Text className="px-6 pt-2 text-sm text-muted dark:text-mutedDark">{helper}</Text>
      <View className="mt-2">
        <SettingOptionsList options={DELAY_OPTIONS} value={value} onSelect={onSelect} />
      </View>
    </SafeAreaView>
  );
}
