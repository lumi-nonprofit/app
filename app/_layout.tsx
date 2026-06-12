/* Kořenový layout: fonty, SafeAreaProvider, hydratace storu (render až po
   načtení) a ochrana rout — bez onboardingu se nikam jinam nedostaneš.
   Žádná business logika, jen skládání. */
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
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
import { colors } from "../src/theme";

SplashScreen.preventAutoHideAsync().catch(() => {
  /* splash už může být skrytý (např. po fast refreshi) */
});

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
      </Stack.Protected>
      <Stack.Protected guard={!state.onboarded}>
        <Stack.Screen name="onboarding" />
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
          <StatusBar style="dark" />
          <RootNavigator />
        </AppStateProvider>
      </DbProvider>
    </SafeAreaProvider>
  );
}
