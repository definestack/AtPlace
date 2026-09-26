import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLogo } from "@/components/AppLogo";

/** How long the in-app splash (logo + tagline) stays up before redirecting to Home. */
const SPLASH_DURATION_MS = 1200;

/**
 * App entry route. The native boot splash (`expo-splash-screen`) covers the
 * JS bundle load but can only show an image on a solid color — it can't
 * render text. This brief in-app splash follows it so the tagline
 * ("Remember it. Where it matters.") gets shown alongside the logo before
 * landing on Home.
 */
export default function Index() {
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  if (splashDone) return <Redirect href="/home" />;

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-cream dark:bg-brand-deep">
      <View className="items-center">
        <AppLogo size={120} />
        <Text className="mt-4 text-2xl font-bold text-brand dark:text-white">At Place</Text>
        <Text className="mt-1 text-sm text-muted dark:text-mutedDark">
          Remember it. Where it matters.
        </Text>
      </View>
    </SafeAreaView>
  );
}
