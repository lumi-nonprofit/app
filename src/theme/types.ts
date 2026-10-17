/* Typy vrstvy tématu. Sémantické role jsou stejné pro light i dark;
   hodnoty generuje design/tokens → tokens.generated.ts. */
import type { TextStyle, ViewStyle } from "react-native";
import type { lightColors, radius, space } from "./tokens.generated";

export type ThemeScheme = "light" | "dark";
export type ThemeColors = { readonly [K in keyof typeof lightColors]: string };

export type MoodId = "energie" | "napeti" | "klid" | "utlum";

/** Barvy jednoho stavu: výplň tvaru (stejná v obou režimech), měkká dlaždice,
    silný tón pro obrys a text — informace nikdy jen barvou (tvar + obrys). */
export interface MoodColors {
  fill: string;
  soft: string;
  strong: string;
}

export interface ThemeElevation {
  card: ViewStyle;
  raised: ViewStyle;
}

export interface ThemePlatform {
  /** Minimální dotykový cíl: 44 pt (HIG) / 48 dp (Android). */
  minTouch: number;
  /** Okraj obsahu obrazovky: 20 pt (HIG layout margin) / 16 dp (Material). */
  screenMargin: number;
  /** Minimální výška řádku seznamu: 44 pt / 56 dp. */
  listRowMinHeight: number;
  isIOS: boolean;
  isAndroid: boolean;
}

export interface Theme {
  scheme: ThemeScheme;
  colors: ThemeColors;
  mood: Record<MoodId, MoodColors>;
  space: typeof space;
  radius: typeof radius;
  elevation: ThemeElevation;
  platform: ThemePlatform;
  /** Hairline karty v dark (stíny nejsou vidět); v light prázdný styl. */
  cardBorder: ViewStyle;
  /** Výchozí styl textu (barva těla) pro rychlé použití mimo ds/Text. */
  baseText: TextStyle;
  /** Barva Android ripple (Material state layer) nad plochami. */
  ripple: string;
  /** Opacita stisknutého prvku na iOS (HIG: tlačítko vždy má press state). */
  pressedOpacity: number;
}
