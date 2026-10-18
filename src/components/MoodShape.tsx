/* MoodShape — tvar stavu (kruh / kosočtverec / čtverec / půlkruh).
   Stavy se rozlišují barvou A ZÁROVEŇ tvarem — informace nikdy jen barvou.
   Výplň nese zamčený mood token, obrys silný tón odstínu (≥ 3:1 vůči každé
   ploše i měkké dlaždici — WCAG 1.4.11), takže je tvar čitelný i tam, kde by
   samotná výplň splývala. */
import React from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import type { Mood, MoodShapeKind } from "../model";
import { useTheme } from "../theme";

interface Props {
  mood?: Mood | null;
  size?: number;
  /** Jen obrys bez výplně (prázdný den v přehledu). */
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
    /* half — zapadající světlo (dolní půlkruh) */
    const m = s / 2;
    shapeEl = (
      <Path
        d={`M ${e} ${m * 0.82} A ${m - e} ${m - e} 0 0 0 ${s - e} ${m * 0.82} Z`}
        {...common}
        strokeLinejoin="round"
      />
    );
  }
  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} accessible={false} style={style}>
      {shapeEl}
    </Svg>
  );
}
