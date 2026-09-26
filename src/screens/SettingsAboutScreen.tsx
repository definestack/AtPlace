import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLogo } from "@/components/AppLogo";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useSettingsStore } from "@/store/settingsStore";

const DEVELOPER_MODE_TAP_THRESHOLD = 10;
const DEVELOPER_MODE_COUNTDOWN_START = 3;
/** How long the countdown/success feedback line stays on screen before clearing itself. */
const FEEDBACK_DISMISS_MS = 2500;

/**
 * About drill-in (Settings > About, mockup #10): app identity, version, and
 * package id, read from the Expo config (`app.config.js`) at runtime so this
 * never drifts out of sync with the actual build.
 *
 * Tapping the app logo 10 times enables developer mode (mirrors Android's
 * "tap build number" easter egg), revealing the Event Log entry on the
 * Settings screen. See `settingsStore.developerModeEnabled`.
 *
 * Feedback is a reactive inline label rather than `ToastAndroid` — Android
 * toasts queue up (~2s each), which made rapid taps feel unregistered, the
 * countdown look stale, and repeated "already enabled" toasts stack up after
 * unlocking. State-driven text updates instantly on every tap and never
 * queues (issue #49).
 */
export function SettingsAboutScreen() {
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? "1.0.0";
  const androidPackage = Constants.expoConfig?.android?.package ?? "in.definestack.atplace";
  const developerModeEnabled = useSettingsStore((state) => state.developerModeEnabled);
  const setDeveloperModeEnabled = useSettingsStore((state) => state.setDeveloperModeEnabled);
  const [tapCount, setTapCount] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Auto-dismiss the feedback line, mirroring a toast fading out on its own.
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), FEEDBACK_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [feedback]);

  function handleLogoPress() {
    // Once enabled, further taps are a no-op — nothing to count down and
    // nothing to announce, so no message can ever stack up.
    if (developerModeEnabled) return;

    const nextCount = tapCount + 1;
    const remaining = DEVELOPER_MODE_TAP_THRESHOLD - nextCount;

    if (remaining <= 0) {
      setTapCount(0);
      setDeveloperModeEnabled(true);
      setFeedback("You're now a developer!");
      return;
    }

    setTapCount(nextCount);
    setFeedback(
      remaining <= DEVELOPER_MODE_COUNTDOWN_START
        ? `You're ${remaining} ${remaining === 1 ? "step" : "steps"} away from developer mode`
        : null,
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-brand-deep" edges={["top", "left", "right"]}>
      <ScreenHeader title="About" onBack={() => router.back()} />
      <View className="items-center px-6 pt-8">
        <Pressable onPress={handleLogoPress} hitSlop={16}>
          <AppLogo size={72} />
        </Pressable>
        <Text className="mt-4 text-2xl font-bold text-brand dark:text-white">At Place</Text>
        <Text className="mt-1 text-sm text-muted dark:text-mutedDark">
          Remember it. Where it matters.
        </Text>
        {feedback ? (
          <Text className="mt-2 text-xs text-muted dark:text-mutedDark">{feedback}</Text>
        ) : null}

        <View className="mt-8 w-full gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-base text-muted dark:text-mutedDark">Version</Text>
            <Text className="text-base text-brand dark:text-white">{version}</Text>
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
