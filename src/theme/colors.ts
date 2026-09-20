/**
 * Shared brand color tokens.
 *
 * These mirror the `theme.extend.colors` entries in `tailwind.config.js`.
 * NativeWind className utilities (e.g. `bg-cream`, `text-brand`) cover most
 * styling needs, but raw hex values are still needed wherever a library
 * expects a color prop directly (e.g. `react-native-svg` fill/stroke,
 * navigation `tabBarActiveTintColor`).
 *
 * `brand`/`brandLight`/`brandDeep` are derived from docs/design/icon.png's
 * red gradient. `brand` is deliberately darker/less saturated than the
 * icon's raw red — it doubles as this app's default text-ink color (mirroring
 * how `navy` used to work), and the icon's vivid red measured well below
 * navy's ~10:1 text contrast against `cream`. `brandLight` keeps the icon's
 * actual vivid tone for accents that need to pop (e.g. selected-state
 * indicators on a dark background). `teal`/`mint`/`coral`/`plum` are the
 * fixed `PlaceColor` palette (place marker tints) and are intentionally
 * independent of the brand color.
 */
export const colors = {
  cream: "#FAF6F0",
  brand: "#7A1420",
  brandLight: "#FC4B54",
  brandDeep: "#26050C",
  teal: "#2E9C8A",
  tealLight: "#34A897",
  muted: "#6B7280",
  mutedDark: "#94A3B8",
  white: "#FFFFFF",
  plum: "#8B5CF6",
  mint: "#22A559",
  coral: "#E5484D",
  track: "#EDE7DE",
  surfaceDark: "#3A0F1A",
} as const;

export type ColorToken = keyof typeof colors;
