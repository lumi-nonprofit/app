/* LumiMark — logo „světlo“ (tři soustředné kruhy); zdroj assets/lumi-mark.svg. */
import React from "react";
import Svg, { Circle } from "react-native-svg";
import { palette } from "../theme.js";

export default function LumiMark({ size = 52, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96" style={style} accessible={false}>
      <Circle cx="48" cy="48" r="34" fill={palette.sun300} opacity={0.35} />
      <Circle cx="48" cy="48" r="22" fill={palette.sun400} opacity={0.55} />
      <Circle cx="48" cy="48" r="12" fill={palette.sun500} />
    </Svg>
  );
}
