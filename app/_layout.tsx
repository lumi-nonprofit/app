/* Kořenový layout: fonty, SafeAreaProvider, hydratace storu (render až po
   načtení) a ochrana rout — bez onboardingu se nikam jinam nedostaneš.
   Žádná business logika, jen skládání. */
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
} from "@expo-google-fonts/bricolage-grotesque";
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
} from "@expo-google-fonts/instrument-sans";
import { AppStateProvider, useAppStore } from "../src/store";
import { DbProvider } from "../src/db/provider";
import { M1_VAULT_SKELETON_ENABLED } from "../src/lib/featureFlags";
import { Button } from "../src/ds";
import { HELP_LINES } from "../src/model";
import { colors, font, leading, type } from "../src/theme";

/* Deep link (např. z notifikace) na detail dostane pod sebe taby,
   aby systémové Zpět vedlo do aplikace, ne mimo ni. */
export const unstable_settings = { anchor: "(tabs)" };

SplashScreen.preventAutoHideAsync().catch(() => {
  /* splash už může být skrytý (např. po fast refreshi) */
});

/* Pád obrazovky nesmí odříznout krizovou pomoc: fallback nabízí linky
   i bez databáze a profilu (HIG Feedback: říct, co se stalo a co dál). */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <View style={errorStyles.wrap}>
      <Text accessibilityRole="header" style={errorStyles.title}>
        Něco se nepovedlo
      </Text>
      <Text style={errorStyles.text}>
        Obrazovku se nepodařilo zobrazit. Zkus to znovu; když to nepomůže, aplikaci zavři a
        otevři znovu. Tvoje záznamy zůstávají uložené.
      </Text>
      <Button onPress={() => retry()}>Zkusit znovu</Button>
      <View style={errorStyles.lines}>
        <Text style={errorStyles.linesTitle}>Potřebuješ si promluvit hned?</Text>
        {(["u26", "plus27"] as const).map((band) => {
          const line = HELP_LINES[band];
          return (
            <Button
              key={band}
              variant="crisis"
              href={`tel:${line.phone.replace(/\s/g, "")}`}
              style={errorStyles.lineButton}
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
  React.useEffect(() => {
    // stav i fonty jsou načtené (jinak by se RootNavigator nevykreslil)
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surfacePage } }}
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
    BricolageGrotesque_400Regular,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    InstrumentSans_700Bold,
  });
  if (!fontsLoaded && !fontError) return null;
  return (
    <SafeAreaProvider>
      <DbProvider>
        <AppStateProvider>
          {/* „auto“ sleduje systémový vzhled; ikony stavové lišty se přepnou s Dark Mode */}
          <StatusBar style="auto" />
          <RootNavigator />
        </AppStateProvider>
      </DbProvider>
    </SafeAreaProvider>
  );
}

const errorStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 14,
    backgroundColor: colors.surfacePage,
  },
  title: {
    ...font.display(700),
    fontSize: type.xl,
    lineHeight: leading.tight(type.xl),
    color: colors.textStrong,
  },
  text: {
    ...font.body(400),
    fontSize: type.base,
    lineHeight: leading.body(type.base),
    color: colors.textBody,
  },
  lines: { marginTop: 24, gap: 10 },
  linesTitle: { ...font.body(600), fontSize: type.base, color: colors.textStrong },
  lineButton: { alignSelf: "stretch" },
});
