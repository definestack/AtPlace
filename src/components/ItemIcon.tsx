import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

import { colors } from "@/theme/colors";
import type { PlaceColor, PlaceIconName } from "@/types/place";

type ItemIconProps = {
  icon: PlaceIconName;
  color: PlaceColor;
  size?: number;
};

/**
 * Tinted circular icon used for place and reminder rows (mockups #2, #7).
 * `color` selects the brand tint from theme/colors.ts; NativeWind classNames
 * can't be built dynamically from a variable, so the fill is resolved here
 * and passed as a raw hex, same pattern as AppLogo.
 */
export function ItemIcon({ icon, color, size = 40 }: ItemIconProps) {
  const tint = colors[color];

  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: tint }}
    >
      <Ionicons name={icon} size={size * 0.55} color={colors.white} />
    </View>
  );
}
