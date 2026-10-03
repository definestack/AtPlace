import { useRouter } from "expo-router";
import { ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { SettingOptionsList } from "@/components/SettingOptionsList";
import {
  LOG_RETENTION_MAX_DAYS,
  LOG_RETENTION_MIN_DAYS,
  useSettingsStore,
} from "@/store/settingsStore";

function retentionLabel(days: number): string {
  return days === 1 ? "1 day" : `${days} days`;
}

const RETENTION_OPTIONS: { value: number; label: string }[] = Array.from(
  { length: LOG_RETENTION_MAX_DAYS - LOG_RETENTION_MIN_DAYS + 1 },
  (_, index) => {
    const days = LOG_RETENTION_MIN_DAYS + index;
    return { value: days, label: retentionLabel(days) };
  },
);

/**
 * Log retention drill-in (Settings > Logging > Log retention, issue #89):
 * how many days of Event Log entries to keep before automatic cleanup (see
 * `services/logger.ts#pruneExpiredLogs`). Matches `ReminderDelayScreen`'s
 * layout and "selecting applies immediately" pattern.
 */
export function SettingsLogRetentionScreen() {
  const router = useRouter();
  const logRetentionDays = useSettingsStore((state) => state.logRetentionDays);
  const setLogRetentionDays = useSettingsStore((state) => state.setLogRetentionDays);

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-brand-deep" edges={["top", "left", "right"]}>
      <ScreenHeader title="Log Retention" onBack={() => router.back()} />
      <Text className="px-6 pt-2 text-sm text-muted dark:text-mutedDark">
        Event log entries older than this are deleted automatically.
      </Text>
      <ScrollView className="mt-2">
        <SettingOptionsList
          options={RETENTION_OPTIONS}
          value={logRetentionDays}
          onSelect={setLogRetentionDays}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
