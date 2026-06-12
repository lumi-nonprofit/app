/* MoodShape — tvar stavu (kruh / kosočtverec / čtverec / půlkruh).
   Stavy se rozlišují barvou A ZÁROVEŇ tvarem — informace nikdy jen barvou. */
import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { palette } from "../theme.js";

export default function MoodShape({ mood, size = 18, outline = false, dashed = false, style }) {
  const s = size;
  const fill = outline ? "none" : mood ? mood.color : "none";
  const stroke = outline ? palette.ink400 : "none";
  const common = { fill, stroke, strokeWidth: outline ? 1.6 : 0, strokeDasharray: dashed ? [3, 3] : undefined };
  let shapeEl = null;
  const shape = mood ? mood.shape : "circle";
  if (shape === "circle") {
    shapeEl = <Circle cx={s / 2} cy={s / 2} r={s / 2 - (outline ? 1.5 : 0)} {...common} />;
  } else if (shape === "diamond") {
    const m = s / 2, e = outline ? 1.8 : 0.6;
    shapeEl = <Path d={`M ${m} ${e} L ${s - e} ${m} L ${m} ${s - e} L ${e} ${m} Z`} {...common} strokeLinejoin="round" />;
  } else if (shape === "square") {
    const e = outline ? 1.6 : 0.8;
    shapeEl = <Rect x={e} y={e} width={s - 2 * e} height={s - 2 * e} rx={s * 0.28} {...common} />;
  } else {
    /* half — zapadající světlo (dolní půlkruh) */
    const e = outline ? 1.6 : 0.5, m = s / 2;
    shapeEl = <Path d={`M ${e} ${m * 0.82} A ${m - e} ${m - e} 0 0 0 ${s - e} ${m * 0.82} Z`} {...common} strokeLinejoin="round" />;
  }
  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} accessible={false} style={style}>
      {shapeEl}
    </Svg>
  );
}
