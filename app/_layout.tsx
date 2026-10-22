/* The root layout: the fonts (only Bricolage 600/700 for the titles; the body text uses the
   system font), SafeAreaProvider, the hydration of the store (render after the load) and the
   route guards. Without the onboarding nothing else opens, but the crisis help (/crisis) is
   always available. No business logic here, only composition. */
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
import { initI18n, useTranslation } from "../src/i18n";
import { AppStateProvider, useAppStore } from "../src/store";
import { DbProvider, useDb } from "../src/db/provider";
import { applyHapticsPreference } from "../src/features/settings/preferences";
import { applyNotificationHandler } from "../src/features/settings/reminders";
import { M1_VAULT_SKELETON_ENABLED } from "../src/lib/featureFlags";
import { Button } from "../src/ds";
import CrisisFallback from "../src/features/help/CrisisFallback";
import { closeItem, headerItems } from "../src/components/HeaderItems";
import { stackScreenOptions, useCloseModal } from "../src/components/navigation";
import { ThemeProvider, useTheme } from "../src/theme";

/* A deep link (for example from a notification) to a detail gets the tabs under it, so that
   the system back button leads into the app, not out of it. */
export const unstable_settings = { anchor: "(tabs)" };

/* The message catalogs are ready before the first render (the language follows the device). */
initI18n();

/* A reminder that arrives while the app is open has no sound and no badge. This applies from the
   start, also before the person opens Settings. */
applyNotificationHandler();

SplashScreen.preventAutoHideAsync().catch(() => {
  /* The splash screen possibly closed already (for example after a fast refresh). */
});

/* A crash of a screen must not cut off the crisis help: the fallback offers the lines even
   without the database and the profile (HIG Feedback: say what happened and what comes next).
   The router draws it outside the app tree, so it has its own ThemeProvider. */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  const { t } = useTranslation("common");
  return (
    <ThemeProvider>
      <CrisisFallback
        title={t("errors.screenFailed.title")}
        message={t("errors.screenFailed.message")}
        action={<Button onPress={() => retry()}>{t("actions.retry")}</Button>}
      />
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { state } = useAppStore();
  const { t } = useTranslation("navigation");
  const theme = useTheme();
  const closeModal = useCloseModal();
  const closeToCalm = useCloseModal("/calm");
  const db = useDb();
  React.useEffect(() => {
    // The state and the fonts are ready here; otherwise RootNavigator does not render.
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  /* The stored haptics choice applies from the start (Settings only changes it). */
  React.useEffect(() => {
    applyHapticsPreference(db);
  }, [db]);
  /* The window background follows the scheme: no white or black flash at transitions (HIG Dark Mode). */
  React.useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.surfacePage).catch(() => {});
  }, [theme.colors.surfacePage]);
  /* expo-router 58 sends a route with a false guard to `redirectTo`. Without it, the router
     takes the first free route in file order, and before the onboarding that is /crisis. */
  const startHref = state.onboarded ? "/" : "/onboarding";
  return (
    /* The nested stacks draw their headers; the root turns them on only for modal tasks. */
    <Stack screenOptions={{ ...stackScreenOptions(theme), headerShown: false }}>
      <Stack.Protected guard={state.onboarded} redirectTo="/onboarding">
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="checkin" options={{ presentation: "modal" }} />
        <Stack.Screen
          name="measure/[type]"
          options={{ presentation: "modal", headerShown: true, title: t("titles.measure") }}
        />
        {/* The player: immersive, without swipe-down ("Dech naslepo" draws the whole area). */}
        <Stack.Screen
          name="calm/[id]"
          options={{
            presentation: "fullScreenModal",
            headerShown: true,
            title: t("titles.calm"),
            gestureEnabled: false,
            ...headerItems(theme, { left: [closeItem(closeToCalm)] }),
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            presentation: "modal",
            headerShown: true,
            title: t("titles.settings"),
            ...headerItems(theme, { left: [closeItem(closeModal)] }),
          }}
        />
        <Stack.Screen
          name="handover"
          options={{
            presentation: "fullScreenModal",
            headerShown: true,
            title: t("titles.handover"),
            gestureEnabled: false,
            ...headerItems(theme, { left: [closeItem(closeModal)] }),
          }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!state.onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      {/* The crisis help outside the guard: static lines, without the profile and the database. */}
      <Stack.Screen
        name="crisis"
        options={{
          presentation: "modal",
          headerShown: true,
          title: t("titles.crisis"),
          ...headerItems(theme, { left: [closeItem(closeModal)] }),
        }}
      />
      {/* The M1 skeleton over the Rust vault. While the flag is off, the route does not exist,
          and a deep link to it opens the start screen: the onboarding or Dnes. */}
      <Stack.Protected guard={M1_VAULT_SKELETON_ENABLED} redirectTo={startHref}>
        <Stack.Screen name="m1-checkin" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const { t } = useTranslation("common");
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
              title={t("errors.databaseFailed.title")}
              message={t("errors.databaseFailed.message")}
            />
          }
        >
          <AppStateProvider>
            {/* "auto" follows the system appearance; the status bar icons switch with Dark Mode. */}
            <StatusBar style="auto" />
            <RootNavigator />
          </AppStateProvider>
        </DbProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
