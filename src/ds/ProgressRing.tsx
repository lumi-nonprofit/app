/* ProgressRing — kruhový ukazatel se zaobleným koncem; kanonické zobrazení WHO-5 indexu.
   Statický (bez animace). */
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors, palette, font, tracking } from "../theme";

interface Props {
  /** 0–1; mimo rozsah se ořízne */
  value?: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  label?: string;
  sublabel?: string;
  labelColor?: string;
  sublabelColor?: string;
}

export default function ProgressRing({
  value = 0,
  size = 72,
  stroke = 8,
  color = palette.sun500,
  track = palette.cream100,
  label,
  sublabel,
  labelColor = colors.textStrong,
  sublabelColor = colors.textMuted,
}: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, value)));
  const labelSize = size / 4.2;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={styles.svg}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={[c, c]}
          strokeDashoffset={off}
        />
      </Svg>
      <View style={styles.overlay}>
        {label ? (
          <Text
            style={[
              styles.label,
              {
                color: labelColor,
                fontSize: labelSize,
                letterSpacing: tracking.display(labelSize),
              },
            ]}
          >
            {label}
          </Text>
        ) : null}
        {sublabel ? (
          <Text
            style={[styles.sublabel, { fontSize: Math.max(10, size / 7.5), color: sublabelColor }]}
          >
            {sublabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  label: { ...font.display(700), fontVariant: ["tabular-nums"], textAlign: "center" },
  sublabel: { ...font.body(400), textAlign: "center" },
});
