import { Image } from "react-native";

type AppLogoProps = {
  size?: number;
};

/** `assets/images/splash-icon.png` is 439×480 — glyph-only crop of the app icon. */
const ASSET_ASPECT_RATIO = 480 / 439;

/**
 * Brand mark: the blue bell-with-location-pin glyph from the app icon
 * (docs/design/Icon.png), rendered from the pre-extracted, transparent-background
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
