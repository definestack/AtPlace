import { Redirect } from "expo-router";

/**
 * App entry route. No in-app splash/intro — go straight to Home (the native
 * boot splash from `expo-splash-screen` already covers the JS bundle load).
 */
export default function Index() {
  return <Redirect href="/home" />;
}
