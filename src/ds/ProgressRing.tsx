/* ProgressRing — kruhový ukazatel se zaobleným koncem; kanonické zobrazení WHO-5
   indexu. Statický (bez animace). Pro čtečku je to progressbar s hodnotou;
   popisek v kruhu škáluje s průměrem i se systémovou velikostí písma. */
import { PixelRatio, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { createThemedStyles, font, tracking, useTheme } from "../theme";

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
  /** Popis pro čtečku, např. „Wellbeing index“ (hodnota se doplní automaticky). */
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
  /* Záměrně mimo typografickou škálu: velikosti popisků se odvozují z průměru
     kruhu; při větším systémovém písmu roste i kruh (max 1,3×). */
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
    >
      <Svg width={dim} height={dim} style={styles.svg}>
        <Circle
          cx={dim / 2}
          cy={dim / 2}
          r={(r * dim) / size}
          fill="none"
          stroke={track ?? (theme.scheme === "dark" ? theme.colors.surfaceElevated : theme.colors.surfaceSunken)}
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
            allowFontScaling={false}
            style={[
              styles.label,
              {
                color: labelColor ?? theme.colors.textStrong,
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
            allowFontScaling={false}
            style={[
              styles.sublabel,
              { fontSize: Math.max(10, dim / 7.5), color: sublabelColor ?? theme.colors.textMuted },
            ]}
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
  label: { ...font.display(700), fontVariant: ["tabular-nums"], textAlign: "center" },
  sublabel: { ...font.body(400), textAlign: "center" },
}));
