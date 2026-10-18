/* Shared options of the native stack (iOS HIG toolbars / Android top app bar).
   iOS: a large title on the tab roots, the system back button without text
   (`headerBackButtonDisplayMode: "minimal"`), no custom bar background: the system supplies
   Liquid Glass and the scroll edge effect. Android: the title on the left in Bricolage
   (M3 titleLarge 22 sp), the bar in the page colour without a shadow. */
import type { NativeStackNavigationOptions } from "expo-router";
import { useRouter } from "expo-router";
import { DISPLAY_FONT } from "../ds/Text";
import type { Theme } from "../theme";

export function stackScreenOptions(theme: Theme): NativeStackNavigationOptions {
  const ios = theme.platform.isIOS;
  return {
    headerShown: true,
    headerTintColor: theme.colors.textStrong,
    headerTitleAlign: ios ? "center" : "left",
    headerTitleStyle: ios
      ? { color: theme.colors.textStrong }
      : {
          fontFamily: DISPLAY_FONT.semibold,
          fontSize: theme.platform.headerTitleSize,
          color: theme.colors.textStrong,
        },
    headerLargeTitleStyle: { fontFamily: DISPLAY_FONT.bold, color: theme.colors.textStrong },
    headerStyle: ios ? undefined : { backgroundColor: theme.colors.surfacePage },
    headerShadowVisible: false,
    headerBackButtonDisplayMode: "minimal",
    contentStyle: { backgroundColor: theme.colors.surfacePage },
  };
}

/** The root of a tab: on iOS a large title that collapses to the standard title on scroll. */
export function largeTitleOptions(theme: Theme): NativeStackNavigationOptions {
  return { headerLargeTitleEnabled: theme.platform.isIOS };
}

/** Closes a modal task: back, or the fallback route after a deep link without history. */
export function useCloseModal(
  fallback: Parameters<ReturnType<typeof useRouter>["replace"]>[0] = "/",
) {
  const router = useRouter();
  return () => {
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
  };
}
