/* Text: the only text component of Lumi (the lint forbids the RN `Text` in screens).

   The variants map the iOS text styles (HIG Typography; they scale with Dynamic Type through
   `dynamicTypeRamp`) and the Material 3 type roles (Android, sp). Bricolage Grotesque 600/700
   carries the titles. The system font (SF Pro / Roboto) with its true weight carries
   everything else. HIG guidance on the brand: a custom font for the headlines, the system
   font for the body text. Bold Text (iOS) cannot change custom fonts, thus the titles go
   from 600 to 700.

   The color comes only through the semantic roles of the theme (`color`); an exception with
   a fixed color on a fixed surface comes through `style`. The components set the limits of
   the scale factor (buttons 2×, chips 1.6×, badge 1.5×); the kicker has 1.6× built in. */
import React from "react";
import { Platform, Text as RNText } from "react-native";
import type { TextProps as RNTextProps, TextStyle } from "react-native";
import { useBoldTextSetting, useTheme } from "../theme";
import type { ThemeColors } from "../theme";

export type TextVariant =
  | "display"
  | "largeTitle"
  | "title1"
  | "title2"
  | "title3"
  | "headline"
  | "body"
  | "callout"
  | "subheadline"
  | "footnote"
  | "caption1"
  | "caption2"
  | "label"
  | "kicker";

/** The text roles of the theme: textStrong, textBody, textMuted, textOnSunken, textOnPrimary… */
export type TextColor = Extract<keyof ThemeColors, `text${string}`>;
export type TextWeight = "regular" | "medium" | "semibold" | "bold";
export type TextAlign = "left" | "center" | "right";

type Ramp = NonNullable<RNTextProps["dynamicTypeRamp"]>;

interface Metrics {
  size: number;
  line: number;
}

interface VariantSpec {
  ios: Metrics;
  android: Metrics;
  ramp: Ramp;
  family: "display" | "system";
  weight: TextWeight;
  color: TextColor;
  /** The tracking in em: negative for the titles, positive for the kicker. */
  tracking?: number;
  uppercase?: boolean;
  maxScale?: number;
}

/* iOS: the Large (default) sizes of the text styles. Android: the M3 roles, that is
   `display → displayMedium`, `largeTitle → headlineLarge`,
   `title1–3 → headlineMedium, headlineSmall, titleLarge`, `headline → titleMedium`,
   `body → bodyLarge`, `callout, subheadline → bodyMedium`, `footnote → bodySmall`,
   `caption → labelMedium, labelSmall`, `label → labelLarge`, `kicker → labelSmall`
   raised to 12 sp. */
const SPECS: Record<TextVariant, VariantSpec> = {
  display: {
    ios: { size: 44, line: 52 },
    android: { size: 45, line: 52 },
    ramp: "largeTitle",
    family: "display",
    weight: "bold",
    color: "textStrong",
    tracking: -0.02,
  },
  largeTitle: {
    ios: { size: 34, line: 41 },
    android: { size: 32, line: 40 },
    ramp: "largeTitle",
    family: "display",
    weight: "bold",
    color: "textStrong",
    tracking: -0.02,
  },
  title1: {
    ios: { size: 28, line: 34 },
    android: { size: 28, line: 36 },
    ramp: "title1",
    family: "display",
    weight: "bold",
    color: "textStrong",
    tracking: -0.02,
  },
  title2: {
    ios: { size: 22, line: 28 },
    android: { size: 24, line: 32 },
    ramp: "title2",
    family: "display",
    weight: "bold",
    color: "textStrong",
    tracking: -0.015,
  },
  title3: {
    ios: { size: 20, line: 25 },
    android: { size: 22, line: 28 },
    ramp: "title3",
    family: "display",
    weight: "semibold",
    color: "textStrong",
    tracking: -0.01,
  },
  headline: {
    ios: { size: 17, line: 22 },
    android: { size: 16, line: 24 },
    ramp: "headline",
    family: "system",
    weight: "semibold",
    color: "textStrong",
  },
  body: {
    ios: { size: 17, line: 22 },
    android: { size: 16, line: 24 },
    ramp: "body",
    family: "system",
    weight: "regular",
    color: "textBody",
  },
  callout: {
    ios: { size: 16, line: 21 },
    android: { size: 14, line: 20 },
    ramp: "callout",
    family: "system",
    weight: "regular",
    color: "textBody",
  },
  subheadline: {
    ios: { size: 15, line: 20 },
    android: { size: 14, line: 20 },
    ramp: "subheadline",
    family: "system",
    weight: "regular",
    color: "textBody",
  },
  footnote: {
    ios: { size: 13, line: 18 },
    android: { size: 12, line: 16 },
    ramp: "footnote",
    family: "system",
    weight: "regular",
    color: "textMuted",
  },
  caption1: {
    ios: { size: 12, line: 16 },
    android: { size: 12, line: 16 },
    ramp: "caption1",
    family: "system",
    weight: "medium",
    color: "textMuted",
  },
  caption2: {
    ios: { size: 11, line: 13 },
    android: { size: 11, line: 16 },
    ramp: "caption2",
    family: "system",
    weight: "medium",
    color: "textMuted",
  },
  /* the label of a control: iOS body semibold, Android labelLarge */
  label: {
    ios: { size: 17, line: 22 },
    android: { size: 14, line: 20 },
    ramp: "body",
    family: "system",
    weight: "semibold",
    color: "textStrong",
  },
  kicker: {
    ios: { size: 12, line: 16 },
    android: { size: 12, line: 16 },
    ramp: "caption1",
    family: "system",
    weight: "semibold",
    color: "textMuted",
    tracking: 0.06,
    uppercase: true,
    maxScale: 1.6,
  },
};

/* Bricolage: with statically loaded fonts, RN does not switch the cut through `fontWeight`.
   `fontFamily` selects the weight; thus the titles do not set `fontWeight`, because Android
   then adds a synthetic bold. Lighter cuts do not exist (HIG: avoid light cuts). */
export const DISPLAY_FONT = {
  semibold: "BricolageGrotesque_600SemiBold",
  bold: "BricolageGrotesque_700Bold",
} as const;

const SYSTEM_WEIGHT: Record<TextWeight, NonNullable<TextStyle["fontWeight"]>> = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
};

const metricsFor = (spec: VariantSpec): Metrics =>
  Platform.OS === "android" ? spec.android : spec.ios;

const styleCache = new Map<string, TextStyle>();

/** The variant style without a color: for `TextInput` and other elements outside `ds/Text`. */
export function textStyle(
  variant: TextVariant,
  weight?: TextWeight,
  options: { boldText?: boolean } = {},
): TextStyle {
  const spec = SPECS[variant];
  const w = weight ?? spec.weight;
  const boldText = !!options.boldText;
  const key = `${variant}:${w}:${boldText ? 1 : 0}`;
  const cached = styleCache.get(key);
  if (cached) return cached;
  const m = metricsFor(spec);
  const style: TextStyle = { fontSize: m.size, lineHeight: m.line };
  if (spec.family === "display") {
    style.fontFamily = w === "bold" || boldText ? DISPLAY_FONT.bold : DISPLAY_FONT.semibold;
  } else {
    style.fontWeight = SYSTEM_WEIGHT[w];
  }
  if (spec.tracking) style.letterSpacing = Math.round(spec.tracking * m.size * 100) / 100;
  if (spec.uppercase) style.textTransform = "uppercase";
  styleCache.set(key, style);
  return style;
}

const TABULAR: TextStyle = { fontVariant: ["tabular-nums"] };

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: TextColor;
  weight?: TextWeight;
  align?: TextAlign;
  /** Digits of equal width (countdowns, percentages): the text does not jump on a change. */
  tabular?: boolean;
}

export default function Text({
  variant = "body",
  color,
  weight,
  align,
  tabular = false,
  style,
  maxFontSizeMultiplier,
  ...rest
}: TextProps) {
  const theme = useTheme();
  const boldText = useBoldTextSetting();
  const spec = SPECS[variant];
  const base = textStyle(variant, weight, { boldText });
  return (
    <RNText
      {...rest}
      dynamicTypeRamp={Platform.OS === "ios" ? spec.ramp : undefined}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? spec.maxScale}
      style={[
        base,
        { color: theme.colors[color ?? spec.color] },
        align ? { textAlign: align } : null,
        tabular ? TABULAR : null,
        style,
      ]}
    />
  );
}
