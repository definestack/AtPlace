import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";

type SplashIllustrationProps = {
  width: number;
  isDark?: boolean;
};

const VIEW_WIDTH = 400;
const VIEW_HEIGHT = 200;

/** [x, width, top] for each dark-mode skyline building, sharing a y=200 baseline. */
const BUILDINGS: [number, number, number][] = [
  [0, 40, 140],
  [38, 36, 112],
  [72, 32, 152],
  [102, 46, 96],
  [146, 38, 132],
  [182, 52, 108],
  [232, 32, 148],
  [262, 42, 118],
  [302, 36, 156],
  [336, 64, 104],
];

const STARS: [number, number, number][] = [
  [24, 20, 1.4],
  [64, 44, 1],
  [108, 16, 1.2],
  [160, 36, 1],
  [210, 14, 1.4],
  [260, 30, 1],
  [300, 48, 1.2],
  [340, 18, 1],
];

/**
 * Decorative landscape shown edge-to-edge near the bottom of the splash
 * screen, approximating docs/design/app-design_light.png (mockup #1) in
 * light mode and docs/design/app-design_dark.png in dark mode: rolling
 * hills / a winding road by day, a starlit skyline by night.
 */
export function SplashIllustration({ width, isDark = false }: SplashIllustrationProps) {
  const height = width * (VIEW_HEIGHT / VIEW_WIDTH);

  if (isDark) {
    return (
      <Svg width={width} height={height} viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}>
        {STARS.map(([cx, cy, r], index) => (
          <Circle key={index} cx={cx} cy={cy} r={r} fill="#E7EFFB" opacity={0.8} />
        ))}
        <Circle cx={358} cy={26} r={22} fill="#274873" opacity={0.6} />

        {BUILDINGS.map(([x, w, top], index) => (
          <Rect
            key={index}
            x={x}
            y={top}
            width={w}
            height={VIEW_HEIGHT - top}
            fill={index % 2 === 0 ? "#132A47" : "#1B3A5F"}
          />
        ))}

        <Ellipse cx={118} cy={168} rx={8} ry={22} fill="#1F4A38" />
        <Ellipse cx={150} cy={176} rx={16} ry={12} fill="#255943" />

        <Path
          d="M0,190 C40,175 55,150 40,125 C25,100 45,75 90,55"
          stroke="#5D86B3"
          strokeWidth={12}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M42,110 C35,110 30,116 30,123 C30,132 42,148 42,148 C42,148 54,132 54,123 C54,116 49,110 42,110 Z"
          fill="#F5F8FE"
        />
      </Svg>
    );
  }

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
