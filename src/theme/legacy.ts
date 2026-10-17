/* Přechodová vrstva: statické konstanty původního src/theme.ts. Nové komponenty
   používají useTheme()/ds/Text; tyto exporty zmizí po migraci všech obrazovek. */
import type { TextStyle } from "react-native";
import { lightColors, motion, palette } from "./tokens.generated";
import { lightElevation } from "./elevation";

/** @deprecated Barvy jen světlého režimu; použij useTheme().colors. */
export const colors = {
  ...lightColors,
  /* původní názvy rolí */
  surfaceInk: lightColors.surfacePrimary,
  textOnInk: lightColors.textOnPrimary,
  textOnAccent: lightColors.textOnCrisis,
  textFaint: lightColors.textMuted,
  accent: lightColors.textAccent,
  accentStrong: lightColors.accentFill,
  positive: lightColors.textPositive,
  info: lightColors.textInfo,
  danger: lightColors.textDanger,
} as const;

/** @deprecated Velikosti písma před Dynamic Type; použij ds/Text varianty. */
export const type = {
  xxs: 11,
  xs: 12,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
  xxxl: 38,
} as const;

export type FontWeight = 400 | 500 | 600 | 700;

/* RN nepřepíná řezy přes fontWeight u staticky nahraných fontů — váhu vybírá
   fontFamily. Bricolage jen pro titulky (600/700); tělo textu = systémový font. */
const DISPLAY_FAMILIES: Record<FontWeight, string> = {
  400: "BricolageGrotesque_600SemiBold",
  500: "BricolageGrotesque_600SemiBold",
  600: "BricolageGrotesque_600SemiBold",
  700: "BricolageGrotesque_700Bold",
};
const BODY_WEIGHTS: Record<FontWeight, TextStyle["fontWeight"]> = {
  400: "400",
  500: "500",
  600: "600",
  700: "700",
};
export const font = {
  /** @deprecated použij ds/Text variantu title nebo largeTitle */
  display: (weight: FontWeight = 400): { fontFamily: string } => ({
    fontFamily: DISPLAY_FAMILIES[weight],
  }),
  /** @deprecated systémový font s váhou; použij ds/Text */
  body: (weight: FontWeight = 400): { fontWeight: TextStyle["fontWeight"] } => ({
    fontWeight: BODY_WEIGHTS[weight],
  }),
};

/** @deprecated */
export const leading = {
  tight: (size: number): number => Math.round(size * 1.15),
  snug: (size: number): number => Math.round(size * 1.3),
  body: (size: number): number => Math.round(size * 1.55),
};
/** @deprecated */
export const tracking = {
  display: (size: number): number => -0.02 * size,
  label: (size: number): number => 0.06 * size,
};

/** @deprecated */
export const text: { base: TextStyle } = {
  base: {
    ...font.body(400),
    fontSize: type.base,
    lineHeight: leading.body(type.base),
    color: colors.textBody,
  },
};

/** @deprecated stíny jen světlého režimu; použij useTheme().elevation */
export const shadow = {
  ...lightElevation,
  /* zlatý glow ring — nahrazuje ho selectionBorder (kontrast 3:1), ponecháno pro migraci */
  glow: {
    shadowColor: palette.sun400,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 7,
    elevation: 4,
  },
} as const;

/** @deprecated použij motion z tokens */
export const dur = motion;
