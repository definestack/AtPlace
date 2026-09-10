import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";

import { AppLogo } from "@/components/AppLogo";
import { SplashIllustration } from "@/components/SplashIllustration";

const AUTO_ADVANCE_DELAY_MS = 2500;

/**
 * First screen shown on app launch. Introduces the app name, tagline and
 * motivational message, then advances to Home automatically — or
 * immediately if the user taps anywhere.
 */
export function SplashScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const hasNavigated = useRef(false);

  const goToHome = () => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    // `replace` (not `push`) so the splash never sits in the back stack —
    // Home becomes the navigation root.
    router.replace("/home");
  };

  useEffect(() => {
    const timer = setTimeout(goToHome, AUTO_ADVANCE_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- goToHome is stable via the ref guard
  }, []);

  return (
    <Pressable className="flex-1 bg-cream" onPress={goToHome}>
      <View className="flex-1 items-center justify-center px-8">
        <AppLogo size={120} />
        <Text className="mt-6 text-4xl font-bold text-navy">AtPlace</Text>
        <Text className="mt-2 text-center text-base text-muted">
          Reminders for real life locations
        </Text>
      </View>

      <View className="pb-6">
        <SplashIllustration width={width} />
        <Text className="mt-4 px-8 text-base text-navy">Be where it matters.</Text>
      </View>
    </Pressable>
  );
}
