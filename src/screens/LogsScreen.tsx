import { Ionicons } from "@expo/vector-icons";
import { File, Paths } from "expo-file-system";
import { useFocusEffect, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useColorScheme } from "nativewind";
import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { deleteAllLogs, getRecentLogs } from "@/db/logsRepository";
import { colors } from "@/theme/colors";
import type { LogCategory, LogEntry } from "@/types/log";

const LOGS_FILE_NAME = "atplace-logs.json";

const CATEGORY_LABEL: Record<LogCategory, string> = {
  geofence: "Geofence",
  notification: "Notification",
  exception: "Error",
  info: "Info",
};

const CATEGORY_COLOR: Record<LogCategory, string> = {
  geofence: colors.brandLight,
  notification: colors.teal,
  exception: colors.coral,
  info: colors.muted,
};

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function LogRow({ log }: { log: LogEntry }) {
  return (
    <View className="border-b border-track px-6 py-3 dark:border-surfaceDark">
      <View className="flex-row items-center justify-between">
        <Text
          className="text-xs font-semibold uppercase"
          style={{ color: CATEGORY_COLOR[log.category] }}
        >
          {CATEGORY_LABEL[log.category]}
        </Text>
        <Text className="text-xs text-muted dark:text-mutedDark">
          {formatTimestamp(log.createdAt)}
        </Text>
      </View>
      <Text className="mt-1 text-base text-brand dark:text-white">{log.message}</Text>
      {log.detail ? (
        <Text className="mt-0.5 text-sm text-muted dark:text-mutedDark">{log.detail}</Text>
      ) : null}
    </View>
  );
}

/**
 * Event Log drill-in (Settings > Event Log, issue #37): a read-only view of
 * geofence triggers, notification deliveries/suppressions, and exceptions
 * persisted by `services/logger.ts` — including ones written from the
 * background geofence task while the app was closed, which is the scenario
 * this screen exists to make visible.
 */
export function LogsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === "dark" ? colors.white : colors.brand;
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setLogs(await getRecentLogs());
    } catch {
      Alert.alert("Something went wrong", "The event log couldn't be loaded.");
    }
  }, []);

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

  const handleShare = async () => {
    try {
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error("Sharing isn't available on this device.");
      }
      const file = new File(Paths.cache, LOGS_FILE_NAME);
      file.create({ overwrite: true });
      file.write(JSON.stringify(logs, null, 2));
      await Sharing.shareAsync(file.uri, {
        mimeType: "application/json",
        dialogTitle: "Share At Place event log",
      });
    } catch {
      Alert.alert("Share failed", "Something went wrong while sharing the event log.");
    }
  };

  const runClear = async () => {
    try {
      await deleteAllLogs();
      await load();
    } catch {
      Alert.alert("Something went wrong", "The event log couldn't be cleared.");
    }
  };

  const handleClear = () => {
    Alert.alert("Clear event log?", "This removes all recorded events. This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: runClear },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-brand-deep" edges={["top", "left", "right"]}>
      <ScreenHeader title="Event Log" onBack={() => router.back()} />
      <View className="flex-row gap-4 px-6 pt-4">
        <Pressable onPress={handleShare} className="flex-row items-center gap-1.5">
          <Ionicons name="share-outline" size={18} color={iconColor} />
          <Text className="text-sm font-medium text-brand dark:text-white">Share</Text>
        </Pressable>
        <Pressable onPress={handleClear} className="flex-row items-center gap-1.5">
          <Ionicons name="trash-outline" size={18} color={colors.coral} />
          <Text className="text-sm font-medium" style={{ color: colors.coral }}>
            Clear
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={logs}
        keyExtractor={(log) => log.id}
        renderItem={({ item }) => <LogRow log={item} />}
        className="flex-1"
        contentContainerClassName="pt-2"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-8 py-12">
            <Text className="text-center text-base text-muted dark:text-mutedDark">
              No events recorded yet
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
