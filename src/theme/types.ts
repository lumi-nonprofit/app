/* The types of the theme layer. The semantic roles are the same for light and dark;
   design/tokens → tokens.generated.ts generates the values. */
import type { TextStyle, ViewStyle } from "react-native";
import type { lightColors, radius, space } from "./tokens.generated";

export type ThemeScheme = "light" | "dark";
export type ThemeColors = { readonly [K in keyof typeof lightColors]: string };

export type MoodId = "energie" | "napeti" | "klid" | "utlum";

/** The colors of one mood: the fill of the shape (the same in both modes), the soft tile,
    the strong tone for the outline and the text: information never only by color (shape +
    outline). */
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
  /** The minimum touch target: 44 pt (HIG) / 48 dp (Android). */
  minTouch: number;
  /** The margin of the screen content: 20 pt (HIG layout margin) / 16 dp (Material). */
  screenMargin: number;
  /** The minimum height of a list row: 44 pt / 56 dp. */
  listRowMinHeight: number;
  /** The title size in the top bar: 17 pt (HIG, native) / 22 sp (M3 titleLarge). */
  headerTitleSize: number;
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
  /** The hairline of a card in dark (shadows are not visible); in light an empty style. */
  cardBorder: ViewStyle;
  /** The default text style (the body color) for a quick use outside ds/Text. */
  baseText: TextStyle;
  /** The color of the Android ripple (Material state layer) over the surfaces. */
  ripple: string;
  /** The opacity of a pressed element on iOS (HIG: a button always has a press state). */
  pressedOpacity: number;
}
