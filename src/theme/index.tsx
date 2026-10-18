/* Lumi — vrstva tématu. Jeden zdroj tokenů (design/tokens → tokens.generated.ts),
   světlé i tmavé schéma podle systému (HIG Dark Mode: žádný vlastní přepínač),
   platformní konstanty a hooky pro komponenty. */
import React from "react";
import { StyleSheet, useColorScheme } from "react-native";
import { useBoldText } from "../lib/a11y";
import { darkElevation, lightElevation } from "./elevation";
import { platform } from "./platform";
import { darkColors, lightColors, mood, motion, palette, radius, space } from "./tokens.generated";
import type { MoodColors, MoodId, Theme, ThemeColors, ThemeScheme } from "./types";

export { palette, mood, space, radius, motion };
export type { Theme, ThemeColors, ThemeScheme, MoodColors, MoodId };
export { contrastRatio } from "./contrast";
export { contrastPairs } from "./contrastPairs";

/* dark musí mít přesně stejné role jako light — typová kontrola generovaného souboru */
const DARK: ThemeColors = darkColors satisfies Record<keyof typeof lightColors, string>;
const LIGHT: ThemeColors = lightColors;

/* Barvy stavů: výplň tvaru je v obou režimech stejná (zamčené mood tokeny),
   měkká dlaždice a silný tón pro obrys/text se přepínají. */
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
/* iOS „Bold Text“: systémový font ztuční sám, Bricolage (titulky) zvedá
   ds/Text o řez výš — jeden listener v provideru místo jednoho na každý Text. */
const BoldTextContext = React.createContext(false);

interface ProviderProps {
  children: React.ReactNode;
  /** Jen pro testy a náhledy; běžně se schéma bere ze systému. */
  scheme?: ThemeScheme;
  /** Jen pro testy; běžně podle nastavení Bold Text. */
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

/** Je zapnutý tučný text (iOS Bold Text)? Čte ds/Text pro titulky. */
export function useBoldTextSetting(): boolean {
  return React.useContext(BoldTextContext);
}

/** Styly závislé na tématu; factory se vyhodnotí jednou na schéma. */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (theme: Theme) => T,
): T {
  const theme = useTheme();
  return React.useMemo(() => StyleSheet.create(factory(theme)), [theme, factory]);
}

/** Tovární varianta pro moduly: const useStyles = createThemedStyles((t) => ({ ... })). */
export function createThemedStyles<T extends StyleSheet.NamedStyles<T>>(
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
