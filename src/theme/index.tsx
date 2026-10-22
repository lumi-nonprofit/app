/* Lumi: the theme layer. One source of tokens (design/tokens → tokens.generated.ts),
   the light and the dark scheme follow the system (HIG Dark Mode: no own switch),
   the platform constants and the hooks for the components. */
import React from "react";
import { StyleSheet, useColorScheme } from "react-native";
import type { ImageStyle, TextStyle, ViewStyle } from "react-native";
import { useBoldText } from "../lib/a11y";
import { darkElevation, lightElevation } from "./elevation";
import { platform } from "./platform";
import { darkColors, lightColors, mood, motion, palette, radius, space } from "./tokens.generated";
import type { MoodColors, MoodId, Theme, ThemeColors, ThemeScheme } from "./types";

export { palette, mood, space, radius, motion };
export type { Theme, ThemeColors, ThemeScheme, MoodColors, MoodId };
export { contrastRatio } from "./contrast";
export { contrastPairs } from "./contrastPairs";

/* dark must have exactly the same roles as light: a type check of the generated file */
const DARK: ThemeColors = darkColors satisfies Record<keyof typeof lightColors, string>;
const LIGHT: ThemeColors = lightColors;

/* The mood colors: the fill of the shape is the same in both modes (locked mood tokens),
   the soft tile and the strong tone for the outline and the text switch. */
const MOOD_LIGHT: Record<MoodId, MoodColors> = {
  energie: { fill: mood.energie, soft: palette.sun100, strong: palette.sun700 },
  napeti: { fill: mood.napeti, soft: palette.lake100, strong: palette.lake700 },
  klid: { fill: mood.klid, soft: palette.sage100, strong: palette.sage700 },
  utlum: { fill: mood.utlum, soft: palette.clay100, strong: palette.clay700 },
};
const MOOD_DARK: Record<MoodId, MoodColors> = {
  energie: { fill: mood.energie, soft: darkColors.accentSoft, strong: palette.sun300 },
  napeti: { fill: mood.napeti, soft: darkColors.infoSoft, strong: palette.lake300 },
  klid: { fill: mood.klid, soft: darkColors.positiveSoft, strong: palette.sage300 },
  utlum: { fill: mood.utlum, soft: darkColors.dangerSoft, strong: palette.clay300 },
};

function buildTheme(scheme: ThemeScheme): Theme {
  const colors = scheme === "dark" ? DARK : LIGHT;
  return {
    scheme,
    colors,
    mood: scheme === "dark" ? MOOD_DARK : MOOD_LIGHT,
    space,
    radius,
    elevation: scheme === "dark" ? darkElevation : lightElevation,
    platform,
    cardBorder:
      scheme === "dark"
        ? { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderSubtle }
        : {},
    baseText: { color: colors.textBody },
    ripple: scheme === "dark" ? "rgba(251, 247, 239, 0.16)" : "rgba(43, 39, 34, 0.12)",
    pressedOpacity: 0.65,
  };
}

export const lightTheme: Theme = buildTheme("light");
export const darkTheme: Theme = buildTheme("dark");

const ThemeContext = React.createContext<Theme>(lightTheme);
/* iOS "Bold Text": the system font gets bold on its own, ds/Text raises Bricolage (the
   titles) one cut up: one listener in the provider instead of one for every Text. */
const BoldTextContext = React.createContext(false);

interface ProviderProps {
  children: React.ReactNode;
  /** Only for tests and previews; normally the scheme comes from the system. */
  scheme?: ThemeScheme;
  /** Only for tests; normally it follows the Bold Text setting. */
  boldText?: boolean;
}

export function ThemeProvider({ children, scheme, boldText }: ProviderProps) {
  const system = useColorScheme();
  const systemBold = useBoldText();
  const resolved: ThemeScheme = scheme ?? (system === "dark" ? "dark" : "light");
  const theme = resolved === "dark" ? darkTheme : lightTheme;
  return (
    <ThemeContext.Provider value={theme}>
      <BoldTextContext.Provider value={boldText ?? systemBold}>{children}</BoldTextContext.Provider>
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return React.useContext(ThemeContext);
}

/** Is the bold text (iOS Bold Text) on? ds/Text reads it for the titles. */
export function useBoldTextSetting(): boolean {
  return React.useContext(BoldTextContext);
}

/* A map of named styles for StyleSheet.create. React Native 0.88 removed StyleSheet.NamedStyles
   from its default types, so the theme layer keeps its own copy. */
type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

/** The styles that depend on the theme; the factory runs once per scheme. */
export function useThemedStyles<T extends NamedStyles<T>>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return React.useMemo(() => StyleSheet.create(factory(theme)), [theme, factory]);
}

/** The factory variant for modules: const useStyles = createThemedStyles((t) => ({ ... })). */
export function createThemedStyles<T extends NamedStyles<T>>(
  factory: (theme: Theme) => T,
): () => T {
  const cache = new Map<ThemeScheme, T>();
  return function useStyles() {
    const theme = useTheme();
    let styles = cache.get(theme.scheme);
    if (!styles) {
      styles = StyleSheet.create(factory(theme));
      cache.set(theme.scheme, styles);
    }
    return styles;
  };
}
