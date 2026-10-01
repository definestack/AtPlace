import { useRouter } from "expo-router";
import { Alert, Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { SettingsRow } from "@/components/SettingsRow";
import { openExactAlarmSettings } from "@/services/notifications";
import { useSettingsStore, type DelayMinutes } from "@/store/settingsStore";

function delayLabel(minutes: DelayMinutes): string {
  if (minutes === 0) return "Immediately";
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

/** Android 14 (API 34) is where `SCHEDULE_EXACT_ALARM` stopped being granted automatically (issue #78). */
const EXACT_ALARM_SETTING_MIN_API = 34;

/**
 * Notifications drill-in (Settings > Notifications, issue #51): the master
 * enable toggle, the global Sound/Vibration defaults used by reminders set
 * to "Use Default" (see `AddReminderScreen`/`EditReminderScreen`), the
 * Arrival/Leave delay drill-ins (driving through a place shouldn't notify —
 * see `services/geofencing.ts`), and, on Android 14+, a link to grant exact
 * alarms so delayed notifications aren't held back by Doze (issue #78).
 * Toggles persist immediately via `settingsStore` — no separate save step.
 */
export function NotificationsSettingsScreen() {
  const router = useRouter();
  const notificationsEnabled = useSettingsStore((state) => state.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((state) => state.setNotificationsEnabled);
  const notificationSound = useSettingsStore((state) => state.notificationSound);
  const setNotificationSound = useSettingsStore((state) => state.setNotificationSound);
  const notificationVibration = useSettingsStore((state) => state.notificationVibration);
  const setNotificationVibration = useSettingsStore((state) => state.setNotificationVibration);
  const arrivalDelayMinutes = useSettingsStore((state) => state.arrivalDelayMinutes);
  const leaveDelayMinutes = useSettingsStore((state) => state.leaveDelayMinutes);

  const handleExactAlarmSettings = async () => {
    try {
      await openExactAlarmSettings();
    } catch {
      Alert.alert("Couldn't open settings", "Something went wrong. Please try again.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-brand-deep" edges={["top", "left", "right"]}>
      <ScreenHeader title="Notifications" onBack={() => router.back()} />
      <View className="mt-2">
        <SettingsRow
          icon="notifications-outline"
          label="Enable notifications"
          toggle={{ value: notificationsEnabled, onValueChange: setNotificationsEnabled }}
        />
        <SettingsRow
          icon="volume-high-outline"
          label="Sound"
          subtitle="Default for reminders set to Use Default"
          toggle={{ value: notificationSound, onValueChange: setNotificationSound }}
        />
        <SettingsRow
          icon="phone-portrait-outline"
          label="Vibration"
          subtitle="Default for reminders set to Use Default"
          toggle={{ value: notificationVibration, onValueChange: setNotificationVibration }}
        />
        <SettingsRow
          icon="timer-outline"
          label="Arrival Delay"
          subtitle={delayLabel(arrivalDelayMinutes)}
          onPress={() => router.push("/settings-arrival-delay")}
        />
        <SettingsRow
          icon="timer-outline"
          label="Leave Delay"
          subtitle={delayLabel(leaveDelayMinutes)}
          onPress={() => router.push("/settings-leave-delay")}
        />
        {Platform.OS === "android" && Platform.Version >= EXACT_ALARM_SETTING_MIN_API ? (
          <SettingsRow
            icon="alarm-outline"
            label="Exact timing"
            subtitle="Allow Alarms & reminders so delayed notifications aren't held back"
            onPress={handleExactAlarmSettings}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}
