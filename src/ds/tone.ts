/* Tones: the 5 shades of the DS as pairs "soft fill + strong text/icon"
   (≥ 4.5:1 on their fill, see contrastPairs) and neutral on the sunken surface.
   Badge, ListItem and the icon tiles share them; thus the screens never touch
   the raw `palette.*` and get the dark mode for free. */
import type { Theme } from "../theme";
import type { TextColor } from "./Text";

export type Tone = "neutral" | "accent" | "positive" | "info" | "danger" | "lilac";

export interface ToneColors {
  /** The soft fill (icon tile, pill). */
  soft: string;
  /** The color of the text and the icon on the soft fill. */
  text: string;
  /** The same as a theme role: for the `color` of `ds/Text`. */
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
