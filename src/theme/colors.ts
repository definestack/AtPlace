/**
 * Shared brand color tokens.
 *
 * These mirror the `theme.extend.colors` entries in `tailwind.config.js`.
 * NativeWind className utilities (e.g. `bg-cream`, `text-navy`) cover most
 * styling needs, but raw hex values are still needed wherever a library
 * expects a color prop directly (e.g. `react-native-svg` fill/stroke,
 * navigation `tabBarActiveTintColor`).
 *
 * Approximated from docs/design/overall-design.png — adjust here (and in
 * tailwind.config.js) if a closer color match is found during self-review.
 */
export const colors = {
  cream: "#FAF6F0",
  navy: "#1E3A5F",
  navyDeep: "#172033",
  teal: "#2E9C8A",
  tealLight: "#34A897",
  rays: "#F5C24B",
  muted: "#6B7280",
  white: "#FFFFFF",
} as const;

export type ColorToken = keyof typeof colors;
