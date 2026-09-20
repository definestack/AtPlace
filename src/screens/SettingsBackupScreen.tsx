import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { BackupImportError, exportData, importData } from "@/services/backup";
import { colors } from "@/theme/colors";

type Busy = "none" | "exporting" | "importing";

/**
 * Backup & Restore drill-in (Settings > Backup & Restore, mockup #10).
 * Export writes all places/reminders/settings to a JSON file and opens the
 * share sheet; Restore picks a JSON file and replaces local data with it
 * after an explicit confirmation, since it's destructive.
 */
export function SettingsBackupScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const [busy, setBusy] = useState<Busy>("none");
  const iconColor = colorScheme === "dark" ? colors.white : colors.brand;

  const handleExport = async () => {
    setBusy("exporting");
    try {
      await exportData();
    } catch {
      Alert.alert("Export failed", "Something went wrong while exporting your data. Please try again.");
    } finally {
      setBusy("none");
    }
  };

  const runImport = async () => {
    setBusy("importing");
    try {
      const restored = await importData();
      if (restored) {
        Alert.alert("Restore complete", "Your places and reminders have been restored.");
      }
    } catch (error) {
      const message =
        error instanceof BackupImportError
          ? error.message
          : "Something went wrong while restoring your data. Please try again.";
      Alert.alert("Restore failed", message);
    } finally {
      setBusy("none");
    }
  };

  const handleImport = () => {
    Alert.alert(
      "Restore from file?",
      "This replaces all current places and reminders with the contents of the backup file. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Restore", style: "destructive", onPress: runImport },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-brand-deep" edges={["top", "left", "right"]}>
      <ScreenHeader title="Backup & Restore" onBack={() => router.back()} />
      <View className="gap-4 px-6 pt-6">
        <Pressable
          onPress={handleExport}
          disabled={busy !== "none"}
          className="flex-row items-center rounded-xl bg-white px-4 py-4 dark:bg-surfaceDark"
          style={{ opacity: busy === "exporting" ? 0.6 : 1 }}
        >
          <Ionicons name="cloud-upload-outline" size={20} color={iconColor} />
          <View className="ml-3 flex-1">
            <Text className="text-base font-medium text-brand dark:text-white">Export data</Text>
            <Text className="text-sm text-muted dark:text-mutedDark">
              Save your places, reminders and settings to a file
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={handleImport}
          disabled={busy !== "none"}
          className="flex-row items-center rounded-xl bg-white px-4 py-4 dark:bg-surfaceDark"
          style={{ opacity: busy === "importing" ? 0.6 : 1 }}
        >
          <Ionicons name="cloud-download-outline" size={20} color={iconColor} />
          <View className="ml-3 flex-1">
            <Text className="text-base font-medium text-brand dark:text-white">
              Restore from file
            </Text>
            <Text className="text-sm text-muted dark:text-mutedDark">
              Replace current data with a previously exported file
            </Text>
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
