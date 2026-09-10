import Svg, { Circle, Line, Path } from "react-native-svg";

import { colors } from "@/theme/colors";

type AppLogoProps = {
  size?: number;
};

/**
 * Brand mark: a teal location pin with a white bell inside and a few short
 * yellow "ping" rays, matching the splash screen mockup (docs/design/overall-design.png).
 */
export function AppLogo({ size = 120 }: AppLogoProps) {
  return (
    <Svg width={size} height={size * (130 / 120)} viewBox="0 0 120 130">
      {/* Pin */}
      <Path
        d="M55,110 C55,110 20,65 20,45 A35,35 0 1,1 90,45 C90,65 55,110 55,110 Z"
        fill={colors.teal}
      />

      {/* Bell */}
      <Path
        d="M55,27 C63,27 69,33 69,41 C69,41 71,51 75,55 L35,55 C39,51 41,41 41,41 C41,33 47,27 55,27 Z"
        fill={colors.white}
      />
      <Circle cx={55} cy={25} r={2.5} fill={colors.white} />
      <Circle cx={55} cy={59} r={3.5} fill={colors.white} />

      {/* Rays: 3 fanned dashes, spaced apart so they read as distinct rays */}
      <Line
        x1={92.6}
        y1={22.2}
        x2={103.3}
        y2={19.3}
        stroke={colors.rays}
        strokeWidth={4.5}
        strokeLinecap="round"
      />
      <Line
        x1={89.8}
        y1={17.2}
        x2={97.6}
        y2={9.4}
        stroke={colors.rays}
        strokeWidth={4.5}
        strokeLinecap="round"
      />
      <Line
        x1={84.8}
        y1={14.4}
        x2={87.7}
        y2={3.7}
        stroke={colors.rays}
        strokeWidth={4.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}
