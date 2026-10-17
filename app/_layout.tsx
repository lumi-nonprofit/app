/* Kořenový layout: fonty (jen Bricolage 600/700 pro titulky — tělo textu je
   systémový font), SafeAreaProvider, hydratace storu (render až po načtení)
   a ochrana rout — bez onboardingu se nikam jinam nedostaneš.
   Žádná business logika, jen skládání. */
import React from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
} from "@expo-google-fonts/bricolage-grotesque";
import { AppStateProvider, useAppStore } from "../src/store";
import { DbProvider } from "../src/db/provider";
import { M1_VAULT_SKELETON_ENABLED } from "../src/lib/featureFlags";
import * as SystemUI from "expo-system-ui";
import { Button, Text } from "../src/ds";
import { HELP_LINES } from "../src/model";
import { ThemeProvider, createThemedStyles, useTheme } from "../src/theme";

/* Deep link (např. z notifikace) na detail dostane pod sebe taby,
   aby systémové Zpět vedlo do aplikace, ne mimo ni. */
export const unstable_settings = { anchor: "(tabs)" };

SplashScreen.preventAutoHideAsync().catch(() => {
  /* splash už může být skrytý (např. po fast refreshi) */
});

/* Pád obrazovky nesmí odříznout krizovou pomoc: fallback nabízí linky
   i bez databáze a profilu (HIG Feedback: říct, co se stalo a co dál).
   Router ho vykresluje mimo strom aplikace, proto má vlastní ThemeProvider. */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <ThemeProvider>
      <ErrorScreen retry={retry} />
    </ThemeProvider>
  );
}

function ErrorScreen({ retry }: { retry: ErrorBoundaryProps["retry"] }) {
  const styles = useErrorStyles();
  return (
    <View style={styles.wrap}>
      <Text accessibilityRole="header" variant="title2">
        Něco se nepovedlo
      </Text>
      <Text variant="body">
        Obrazovku se nepodařilo zobrazit. Zkus to znovu; když to nepomůže, aplikaci zavři a otevři
        znovu. Tvoje záznamy zůstávají uložené.
      </Text>
      <Button onPress={() => retry()}>Zkusit znovu</Button>
      <View style={styles.lines}>
        <Text variant="headline">Potřebuješ si promluvit hned?</Text>
        {(["u26", "plus27"] as const).map((band) => {
          const line = HELP_LINES[band];
          return (
            <Button
              key={band}
              variant="crisis"
              href={`tel:${line.phone.replace(/\s/g, "")}`}
              style={styles.lineButton}
            >
              {`Zavolat ${line.phone} · ${line.name}`}
            </Button>
          );
        })}
      </View>
    </View>
  );
}

function RootNavigator() {
  const { state } = useAppStore();
  const theme = useTheme();
  React.useEffect(() => {
    // stav i fonty jsou načtené (jinak by se RootNavigator nevykreslil)
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  /* pozadí okna sleduje schéma — bez bílého/černého probliknutí při přechodech (HIG Dark Mode) */
  React.useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.surfacePage).catch(() => {});
  }, [theme.colors.surfacePage]);
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.surfacePage },
      }}
    >
      <Stack.Protected guard={state.onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="checkin" options={{ presentation: "modal" }} />
        <Stack.Screen name="measure/[type]" options={{ presentation: "modal" }} />
        <Stack.Screen name="calm/[id]" />
        <Stack.Screen name="reflection" />
        <Stack.Screen name="plan/[section]" />
        <Stack.Screen name="handover" options={{ presentation: "fullScreenModal" }} />
      </Stack.Protected>
      <Stack.Protected guard={!state.onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      {/* M1 skeleton nad Rust trezorem: dokud je flag vypnutý, routa neexistuje
          a deep link na ni otevře první dostupnou obrazovku. */}
      <Stack.Protected guard={M1_VAULT_SKELETON_ENABLED}>
        <Stack.Screen name="m1-checkin" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
  });
  if (!fontsLoaded && !fontError) return null;
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <DbProvider>
          <AppStateProvider>
            {/* „auto“ sleduje systémový vzhled; ikony stavové lišty se přepnou s Dark Mode */}
            <StatusBar style="auto" />
            <RootNavigator />
          </AppStateProvider>
        </DbProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const useErrorStyles = createThemedStyles((t) => ({
  wrap: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 14,
    backgroundColor: t.colors.surfacePage,
  },
  lines: { marginTop: 24, gap: 10 },
  lineButton: { alignSelf: "stretch" },
}));
