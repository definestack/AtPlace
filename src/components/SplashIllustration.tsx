import Svg, { Ellipse, Path } from "react-native-svg";

type SplashIllustrationProps = {
  width: number;
};

const VIEW_WIDTH = 400;
const VIEW_HEIGHT = 200;

/**
 * Decorative landscape (rolling hills, a winding road and a couple of trees)
 * shown edge-to-edge near the bottom of the splash screen, approximating
 * the illustration in docs/design/overall-design.png (mockup #1).
 */
export function SplashIllustration({ width }: SplashIllustrationProps) {
  const height = width * (VIEW_HEIGHT / VIEW_WIDTH);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}>
      {/* Back hill */}
      <Path
        d="M0,120 C80,70 160,150 240,100 C300,65 360,110 400,90 L400,200 L0,200 Z"
        fill="#CFE4DC"
      />

      {/* Front hill */}
      <Path
        d="M0,160 C90,110 180,170 260,130 C320,102 370,140 400,130 L400,200 L0,200 Z"
        fill="#A9CFC0"
      />

      {/* Road */}
      <Path
        d="M0,190 C40,175 55,150 40,125 C25,100 45,75 90,55"
        stroke="#FAF6F0"
        strokeWidth={14}
        strokeLinecap="round"
        fill="none"
      />

      {/* Trees: a slender cypress-like spire and a rounder bush */}
      <Ellipse cx={110} cy={128} rx={7} ry={26} fill="#8FB9A8" />
      <Ellipse cx={140} cy={140} rx={15} ry={13} fill="#5FA98A" />
    </Svg>
  );
}
