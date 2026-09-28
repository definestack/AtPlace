import { useRouter } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { SettingsRow } from "@/components/SettingsRow";
import { useSettingsStore, type DelayMinutes } from "@/store/settingsStore";

function delayLabel(minutes: DelayMinutes): string {
  if (minutes === 0) return "Immediately";
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

/**
 * Notifications drill-in (Settings > Notifications, issue #51): the master
 * enable toggle, the global Sound/Vibration defaults used by reminders set
 * to "Use Default" (see `AddReminderScreen`/`EditReminderScreen`), and the
 * Arrival/Leave delay drill-ins (driving through a place shouldn't notify —
 * see `services/geofencing.ts`). Toggles persist immediately via
 * `settingsStore` — no separate save step.
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
      </View>
    </SafeAreaView>
  );
}
