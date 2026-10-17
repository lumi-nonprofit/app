/* Text — jediná textová komponenta Lumi (RN Text je v obrazovkách zakázaný lintem).

   Varianty mapují iOS text styles (HIG Typography; škálují Dynamic Type přes
   `dynamicTypeRamp`) a Material 3 type roles (Android, sp). Titulky nese
   Bricolage Grotesque 600/700, všechno ostatní systémový font (SF Pro / Roboto)
   se skutečnou váhou — HIG Branding: vlastní font pro headlines, systémový pro
   tělo textu. Bold Text (iOS) vlastní fonty neumí, proto titulky 600 → 700.

   Barva jen přes sémantické role tématu (`color`), výjimky s pevnou barvou na
   pevné ploše přes `style`. Limity škálování nastavují komponenty
   (tlačítka 2×, chipy 1,6×, badge 1,5×); kicker má 1,6× v sobě. */
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

/** Role textu z tématu: textStrong, textBody, textMuted, textOnSunken, textOnPrimary… */
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
  /** Prokládání v em: titulky záporné, kicker kladné. */
  tracking?: number;
  uppercase?: boolean;
  maxScale?: number;
}

/* iOS: Large (výchozí) velikosti textových stylů; Android: M3 role
   (display → displayMedium, largeTitle → headlineLarge, title1–3 → headline
   Medium/Small + titleLarge, headline → titleMedium, body → bodyLarge,
   callout/subheadline → bodyMedium, footnote → bodySmall, caption → label
   Medium/Small, label → labelLarge, kicker → labelSmall povýšený na 12 sp). */
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
  /* popisek ovládacího prvku: iOS body semibold, Android labelLarge */
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

/* Bricolage: RN u staticky nahraných fontů nepřepíná řez přes fontWeight,
   váhu vybírá fontFamily (a fontWeight se proto u titulků nenastavuje —
   Android by jinak přidal syntetické ztučnění). Lehčí řezy neexistují
   (HIG: vyhnout se light řezům). */
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

/** Styl varianty bez barvy — pro TextInput a další prvky mimo ds/Text. */
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
  /** Číslice stejné šířky (odpočty, procenta) — text při změně neposkakuje. */
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
