/* ProgressRing: a circular indicator with a round end; the canonical view of the WHO-5
   index. Static (no animation). For the screen reader it is a progressbar with a value.
   The label in the ring scales with the diameter and with the system font size (max 1.3×).
   Otherwise the number does not fit in the ring: thus `allowFontScaling` is off. */
import { PixelRatio, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { createThemedStyles, useTheme } from "../theme";
import Text from "./Text";

interface Props {
  /** 0–1; the component clamps a value outside the range */
  value?: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  label?: string;
  sublabel?: string;
  labelColor?: string;
  sublabelColor?: string;
  /** The label for the screen reader, for example "Wellbeing index" (the component adds the
      value). */
  accessibilityLabel?: string;
}

export default function ProgressRing({
  value = 0,
  size = 72,
  stroke = 8,
  color,
  track,
  label,
  sublabel,
  labelColor,
  sublabelColor,
  accessibilityLabel,
}: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const clamped = Math.max(0, Math.min(1, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - clamped);
  /* Intentionally outside the typographic scale: the label sizes derive from the diameter
     of the ring; with a larger system font the ring grows too (max 1.3×). */
  const scale = Math.min(1.3, PixelRatio.getFontScale());
  const dim = Math.round(size * scale);
  const labelSize = dim / 4.2;
  const percent = Math.round(clamped * 100);
  return (
    <View
      style={{ width: dim, height: dim }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? sublabel ?? label}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <Svg width={dim} height={dim} style={styles.svg}>
        <Circle
          cx={dim / 2}
          cy={dim / 2}
          r={(r * dim) / size}
          fill="none"
          stroke={
            track ??
            (theme.scheme === "dark" ? theme.colors.surfaceElevated : theme.colors.surfaceSunken)
          }
          strokeWidth={stroke}
        />
        <Circle
          cx={dim / 2}
          cy={dim / 2}
          r={(r * dim) / size}
          fill="none"
          stroke={color ?? theme.colors.accentFill}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={[(c * dim) / size, (c * dim) / size]}
          strokeDashoffset={(off * dim) / size}
        />
      </Svg>
      <View style={styles.overlay}>
        {label ? (
          <Text
            variant="title2"
            tabular
            align="center"
            allowFontScaling={false}
            style={{
              fontSize: labelSize,
              lineHeight: Math.round(labelSize * 1.2),
              letterSpacing: -0.02 * labelSize,
              color: labelColor ?? theme.colors.textStrong,
            }}
          >
            {label}
          </Text>
        ) : null}
        {sublabel ? (
          <Text
            variant="caption1"
            weight="regular"
            align="center"
            allowFontScaling={false}
            style={{
              fontSize: Math.max(10, dim / 7.5),
              lineHeight: Math.round(Math.max(10, dim / 7.5) * 1.3),
              color: sublabelColor ?? theme.colors.textMuted,
            }}
          >
            {sublabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const useStyles = createThemedStyles(() => ({
  svg: { transform: [{ rotate: "-90deg" }] },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
}));
