/* Tóny — pět odstínů DS jako dvojice „měkká výplň + silný text/ikona“
   (≥ 4,5:1 na své výplni, viz contrastPairs) a neutral na zapuštěné ploše.
   Sdílí je Badge, ListItem a ikonové dlaždice; obrazovky tak nikdy nesahají
   na surové palette.* a dark režim dostanou zdarma. */
import type { Theme } from "../theme";
import type { TextColor } from "./Text";

export type Tone = "neutral" | "accent" | "positive" | "info" | "danger" | "lilac";

export interface ToneColors {
  /** Měkká výplň (dlaždice ikony, pill). */
  soft: string;
  /** Barva textu a ikony na měkké výplni. */
  text: string;
  /** Totéž jako role tématu — pro ds/Text `color`. */
  textRole: TextColor;
}

export function toneColors(theme: Theme, tone: Tone): ToneColors {
  const c = theme.colors;
  switch (tone) {
    case "accent":
      return { soft: c.accentSoft, text: c.textAccent, textRole: "textAccent" };
    case "positive":
      return { soft: c.positiveSoft, text: c.textPositive, textRole: "textPositive" };
    case "info":
      return { soft: c.infoSoft, text: c.textInfo, textRole: "textInfo" };
    case "danger":
      return { soft: c.dangerSoft, text: c.textDanger, textRole: "textDanger" };
    case "lilac":
      return { soft: c.lilacSoft, text: c.textLilac, textRole: "textLilac" };
    default:
      return { soft: c.surfaceSunken, text: c.textOnSunken, textRole: "textOnSunken" };
  }
}
