/**
 * Shared brand color tokens.
 *
 * These mirror the `theme.extend.colors` entries in `tailwind.config.js`.
 * NativeWind className utilities (e.g. `bg-cream`, `text-brand`) cover most
 * styling needs, but raw hex values are still needed wherever a library
 * expects a color prop directly (e.g. `react-native-svg` fill/stroke,
 * navigation `tabBarActiveTintColor`).
 *
 * `brand`/`brandLight`/`brandDeep` are derived from docs/design/Icon.png's
 * blue bell+pin mark. `brand` is a near-black ink navy — it doubles as this
 * app's default text-ink color and light-mode primary-button fill. `brandLight`
 * is the icon's actual vivid blue, used for accents that need to pop against a
 * dark background (dark-mode primary buttons, selected tab/segment state).
 * `brandDeep` is the dark-mode screen background. `teal`/`mint`/`coral`/`plum`
 * are the fixed `PlaceColor` palette (place marker tints) and are
 * intentionally independent of the brand color.
 */
export const colors = {
  cream: "#FAF6F0",
  brand: "#1A344E",
  brandLight: "#0B84F5",
  brandDeep: "#0C1824",
  teal: "#2E9C8A",
  tealLight: "#34A897",
  muted: "#6B7280",
  mutedDark: "#94A3B8",
  white: "#FFFFFF",
  plum: "#8B5CF6",
  mint: "#22A559",
  coral: "#E5484D",
  track: "#E8EDF2",
  surfaceDark: "#132030",
} as const;

export type ColorToken = keyof typeof colors;
