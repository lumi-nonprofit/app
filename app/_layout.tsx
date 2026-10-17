/* Kořenový layout: fonty (jen Bricolage 600/700 pro titulky — tělo textu je
   systémový font), SafeAreaProvider, hydratace storu (render až po načtení)
   a ochrana rout — bez onboardingu se nikam jinam nedostaneš, krizová pomoc
   (/crisis) je ale dostupná vždy. Žádná business logika, jen skládání. */
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
} from "@expo-google-fonts/bricolage-grotesque";
import * as SystemUI from "expo-system-ui";
import { AppStateProvider, useAppStore } from "../src/store";
import { DbProvider } from "../src/db/provider";
import { M1_VAULT_SKELETON_ENABLED } from "../src/lib/featureFlags";
import { Button } from "../src/ds";
import CrisisFallback from "../src/features/help/CrisisFallback";
import { closeItem, headerItems } from "../src/components/HeaderItems";
import { stackScreenOptions, useCloseModal } from "../src/components/navigation";
import { ThemeProvider, useTheme } from "../src/theme";

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
      <CrisisFallback
        title="Něco se nepovedlo"
        message="Obrazovku se nepodařilo zobrazit. Zkus to znovu; když to nepomůže, aplikaci zavři a otevři znovu. Tvoje záznamy zůstávají uložené."
        action={<Button onPress={() => retry()}>Zkusit znovu</Button>}
      />
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { state } = useAppStore();
  const theme = useTheme();
  const closeModal = useCloseModal();
  const closeToCalm = useCloseModal("/calm");
  React.useEffect(() => {
    // stav i fonty jsou načtené (jinak by se RootNavigator nevykreslil)
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  /* pozadí okna sleduje schéma — bez bílého/černého probliknutí při přechodech (HIG Dark Mode) */
  React.useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.surfacePage).catch(() => {});
  }, [theme.colors.surfacePage]);
  return (
    /* hlavičky si kreslí vnořené stacky; kořen je zapíná jen u modálních úloh */
    <Stack screenOptions={{ ...stackScreenOptions(theme), headerShown: false }}>
      <Stack.Protected guard={state.onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="checkin" options={{ presentation: "modal" }} />
        <Stack.Screen
          name="measure/[type]"
          options={{ presentation: "modal", headerShown: true, title: "Dotazník" }}
        />
        {/* přehrávač: imerzivní, bez swipe-down (Dech naslepo kreslí celou plochu) */}
        <Stack.Screen
          name="calm/[id]"
          options={{
            presentation: "fullScreenModal",
            headerShown: true,
            title: "Klid",
            gestureEnabled: false,
            ...headerItems(theme, { left: [closeItem(closeToCalm)] }),
          }}
        />
        <Stack.Screen
          name="handover"
          options={{
            presentation: "fullScreenModal",
            headerShown: true,
            title: "Pomoc blízkému",
            gestureEnabled: false,
            ...headerItems(theme, { left: [closeItem(closeModal)] }),
          }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!state.onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      {/* krizová pomoc mimo guard: statické linky, bez profilu a databáze */}
      <Stack.Screen
        name="crisis"
        options={{
          presentation: "modal",
          headerShown: true,
          title: "Pomoc hned",
          ...headerItems(theme, { left: [closeItem(closeModal)] }),
        }}
      />
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
        <DbProvider
          fallback={
            <CrisisFallback
              title="Záznamy se nepodařilo otevřít"
              message="Databáze v telefonu teď nejde otevřít. Zavři aplikaci a zkus to znovu — tvoje záznamy zůstávají uložené."
            />
          }
        >
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
