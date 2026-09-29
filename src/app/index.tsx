import { Redirect } from "expo-router";

/**
 * App entry route. The native boot splash (`expo-splash-screen`) already
 * covers the JS bundle load, so this route just redirects straight to Home
 * instead of layering a second, in-app splash on top of it (issue #65).
 */
export default function Index() {
  return <Redirect href="/home" />;
}
