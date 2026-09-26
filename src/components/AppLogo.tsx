import { Image } from "react-native";

type AppLogoProps = {
  size?: number;
};

/**
 * Brand mark: the full app icon tile (blue rounded square with the white
 * bell-in-location-pin glyph, from `docs/design/icon.png`), rendered from
 * the pre-extracted, transparent-cornered `assets/images/splash-icon.png` —
 * regenerated from the design master by `scripts/generate-icons.mjs` — so it
 * always matches the launcher icon exactly. Square, unlike the old
 * glyph-only crop, since it now carries its own blue background and reads
 * on both light and dark surfaces.
 */
export function AppLogo({ size = 120 }: AppLogoProps) {
  return (
    <Image
      source={require("@/assets/images/splash-icon.png")}
      resizeMode="contain"
      style={{ width: size, height: size }}
    />
  );
}
