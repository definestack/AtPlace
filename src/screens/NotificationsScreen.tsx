import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, RefreshControl, SectionList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NotificationRow } from "@/components/NotificationRow";
import { ReminderSectionHeader } from "@/components/ReminderSectionHeader";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useNotificationsStore } from "@/store/notificationsStore";
import { colors } from "@/theme/colors";
import type { AppNotification } from "@/types/notification";
import { groupNotificationsByDate } from "@/utils/groupNotifications";

/**
 * Notification inbox (issue #40): recently triggered location reminders,
 * grouped by day, newest first. No dedicated mockup exists for this screen
 * (`docs/design/` covers screens 1-10, none of them this one), so it follows
 * the app's existing list-screen conventions (`LogsScreen`, `HomeScreen`'s
 * Reminders tab) rather than introducing a new visual pattern.
 */
export function NotificationsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const notifications = useNotificationsStore((state) => state.notifications);
  const hydrate = useNotificationsStore((state) => state.hydrate);
  const markRead = useNotificationsStore((state) => state.markRead);
  const markUnread = useNotificationsStore((state) => state.markUnread);
  const markAllRead = useNotificationsStore((state) => state.markAllRead);
  const deleteNotification = useNotificationsStore((state) => state.deleteNotification);
  const [refreshing, setRefreshing] = useState(false);

  const sections = useMemo(() => groupNotificationsByDate(notifications), [notifications]);
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  const load = useCallback(async () => {
    try {
      await hydrate();
    } catch {
      Alert.alert("Something went wrong", "Notifications couldn't be loaded.");
    }
  }, [hydrate]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handlePress = async (notification: AppNotification) => {
    try {
      if (!notification.read) await markRead(notification.id);
    } finally {
      // Reminders live under Home's Reminders tab (issue #40) — there's no
      // standalone per-reminder details screen to deep-link into yet.
      router.push({ pathname: "/home", params: { tab: "reminders" } });
    }
  };

  const handleToggleRead = async (notification: AppNotification) => {
    try {
      if (notification.read) {
        await markUnread(notification.id);
      } else {
        await markRead(notification.id);
      }
    } catch {
      Alert.alert("Something went wrong", "The notification couldn't be updated.");
    }
  };

  const handleDelete = async (notification: AppNotification) => {
    try {
      await deleteNotification(notification.id);
    } catch {
      Alert.alert("Something went wrong", "The notification couldn't be deleted.");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
    } catch {
      Alert.alert("Something went wrong", "Notifications couldn't be marked as read.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-brand-deep" edges={["top", "left", "right"]}>
      <ScreenHeader title="Notifications" />

      {unreadCount > 0 ? (
        <View className="flex-row px-6 pt-4">
          <Pressable onPress={handleMarkAllRead} className="flex-row items-center gap-1.5">
            <Ionicons
              name="checkmark-done-outline"
              size={18}
              color={isDark ? colors.white : colors.brand}
            />
            <Text className="text-sm font-medium text-brand dark:text-white">
              Mark all as read
            </Text>
          </Pressable>
        </View>
      ) : null}

      <SectionList
        sections={sections}
        keyExtractor={(notification) => notification.id}
        renderItem={({ item }) => (
          <NotificationRow
            notification={item}
            onPress={handlePress}
            onToggleRead={handleToggleRead}
            onDelete={handleDelete}
          />
        )}
        renderSectionHeader={({ section }) => <ReminderSectionHeader title={section.title} />}
        className="flex-1"
        contentContainerClassName="pt-2"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-8 py-16">
            <Ionicons
              name="notifications-outline"
              size={40}
              color={isDark ? colors.mutedDark : colors.muted}
            />
            <Text className="mt-4 text-center text-lg font-semibold text-brand dark:text-white">
              You&apos;re all caught up
            </Text>
            <Text className="mt-1 text-center text-base text-muted dark:text-mutedDark">
              No location reminders need your attention.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
