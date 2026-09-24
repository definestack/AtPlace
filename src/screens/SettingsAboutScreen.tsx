import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useRef } from "react";
import { Pressable, Text, ToastAndroid, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLogo } from "@/components/AppLogo";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useSettingsStore } from "@/store/settingsStore";

const DEVELOPER_MODE_TAP_THRESHOLD = 10;
const DEVELOPER_MODE_COUNTDOWN_START = 3;

/**
 * About drill-in (Settings > About, mockup #10): app identity, version, and
 * package id, read from the Expo config (`app.config.js`) at runtime so this
 * never drifts out of sync with the actual build.
 *
 * Tapping the version number 10 times enables developer mode (mirrors
 * Android's "tap build number" easter egg), revealing the Event Log entry
 * on the Settings screen. See `settingsStore.developerModeEnabled`.
 */
export function SettingsAboutScreen() {
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? "1.0.0";
  const androidPackage = Constants.expoConfig?.android?.package ?? "in.definestack.atplace";
  const developerModeEnabled = useSettingsStore((state) => state.developerModeEnabled);
  const setDeveloperModeEnabled = useSettingsStore((state) => state.setDeveloperModeEnabled);
  const tapCountRef = useRef(0);

  function handleVersionPress() {
    if (developerModeEnabled) {
      ToastAndroid.show("Developer mode is already enabled.", ToastAndroid.SHORT);
      return;
    }

    tapCountRef.current += 1;
    const remaining = DEVELOPER_MODE_TAP_THRESHOLD - tapCountRef.current;

    if (remaining <= 0) {
      tapCountRef.current = 0;
      setDeveloperModeEnabled(true);
      ToastAndroid.show("You are now a developer!", ToastAndroid.SHORT);
      return;
    }

    if (remaining <= DEVELOPER_MODE_COUNTDOWN_START) {
      ToastAndroid.show(
        `You are now ${remaining} steps away from being a developer.`,
        ToastAndroid.SHORT,
      );
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-brand-deep" edges={["top", "left", "right"]}>
      <ScreenHeader title="About" onBack={() => router.back()} />
      <View className="items-center px-6 pt-8">
        <AppLogo size={72} />
        <Text className="mt-4 text-2xl font-bold text-brand dark:text-white">At Place</Text>
        <Text className="mt-1 text-sm text-muted dark:text-mutedDark">Be where it matters.</Text>

        <View className="mt-8 w-full gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-base text-muted dark:text-mutedDark">Version</Text>
            <Pressable onPress={handleVersionPress}>
              <Text className="text-base text-brand dark:text-white">{version}</Text>
            </Pressable>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-base text-muted dark:text-mutedDark">Package</Text>
            <Text className="text-base text-brand dark:text-white">{androidPackage}</Text>
          </View>
        </View>

        <Text className="mt-8 text-center text-sm leading-5 text-muted dark:text-mutedDark">
          At Place reminds you about things to do when you arrive at a specific place. Save
          places, attach reminders, and get notified the moment you&rsquo;re there.
        </Text>
      </View>
    </SafeAreaView>
  );
}
