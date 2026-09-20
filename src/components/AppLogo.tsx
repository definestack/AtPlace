import { Image } from "react-native";

type AppLogoProps = {
  size?: number;
};

/** `assets/images/splash-icon.png` is 438×480 — glyph-only crop of the app icon. */
const ASSET_ASPECT_RATIO = 480 / 438;

/**
 * Brand mark: the red bell-with-location-pin glyph from the app icon
 * (docs/design/icon.png), rendered from the pre-extracted, transparent-background
 * `assets/images/splash-icon.png` so it always matches the icon exactly.
 */
export function AppLogo({ size = 120 }: AppLogoProps) {
  return (
    <Image
      source={require("@/assets/images/splash-icon.png")}
      resizeMode="contain"
      style={{ width: size, height: size * ASSET_ASPECT_RATIO }}
    />
  );
}
