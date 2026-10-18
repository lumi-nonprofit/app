/* MoodShape: the shape of a state (circle / diamond / square / half circle). The states differ
   by colour and also by shape: the information never sits in colour alone. The fill carries the
   locked mood token. The outline carries the strong tone of the hue: at least 3:1 against every
   surface and the soft tile (WCAG 1.4.11). So the shape stays legible where the fill alone
   blends into the surface. */
import React from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import type { Mood, MoodShapeKind } from "../model";
import { useTheme } from "../theme";

interface Props {
  mood?: Mood | null;
  size?: number;
  /** Only the outline without a fill (an empty day in the overview). */
  outline?: boolean;
  dashed?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function MoodShape({
  mood,
  size = 18,
  outline = false,
  dashed = false,
  style,
}: Props) {
  const theme = useTheme();
  const s = size;
  const moodColors = mood ? theme.mood[mood.id] : null;
  const fill = outline || !moodColors ? "none" : moodColors.fill;
  const stroke = outline || !moodColors ? theme.colors.borderStrong : moodColors.strong;
  const strokeWidth = outline ? 1.6 : 1.5;
  const common = {
    fill,
    stroke,
    strokeWidth,
    strokeDasharray: dashed ? [3, 3] : undefined,
  };
  let shapeEl: React.ReactElement | null = null;
  const shape: MoodShapeKind = mood ? mood.shape : "circle";
  const e = strokeWidth;
  if (shape === "circle") {
    shapeEl = <Circle cx={s / 2} cy={s / 2} r={s / 2 - e} {...common} />;
  } else if (shape === "diamond") {
    const m = s / 2;
    shapeEl = (
      <Path
        d={`M ${m} ${e} L ${s - e} ${m} L ${m} ${s - e} L ${e} ${m} Z`}
        {...common}
        strokeLinejoin="round"
      />
    );
  } else if (shape === "square") {
    shapeEl = <Rect x={e} y={e} width={s - 2 * e} height={s - 2 * e} rx={s * 0.28} {...common} />;
  } else {
    /* half: the lower half circle, a light that sets. */
    const m = s / 2;
    // eslint-disable-next-line i18next/no-literal-string -- SVG path data, not text.
    const d = `M ${e} ${m * 0.82} A ${m - e} ${m - e} 0 0 0 ${s - e} ${m * 0.82} Z`;
    shapeEl = <Path d={d} {...common} strokeLinejoin="round" />;
  }
  // eslint-disable-next-line i18next/no-literal-string -- SVG viewBox, not text.
  const viewBox = `0 0 ${s} ${s}`;
  return (
    <Svg width={s} height={s} viewBox={viewBox} accessible={false} style={style}>
      {shapeEl}
    </Svg>
  );
}
