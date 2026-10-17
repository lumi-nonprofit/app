/* Sdílené volby nativního stacku (iOS HIG toolbars / Android top app bar).
   iOS: velký titulek na kořenech tabů, systémové Zpět bez textu
   (`headerBackButtonDisplayMode: "minimal"`), žádné vlastní pozadí lišty —
   Liquid Glass a scroll edge effect dodává systém. Android: titulek vlevo
   v Bricolage (M3 titleLarge 22 sp), lišta v barvě plochy bez stínu. */
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
      : { fontFamily: DISPLAY_FONT.semibold, fontSize: 22, color: theme.colors.textStrong },
    headerLargeTitleStyle: { fontFamily: DISPLAY_FONT.bold, color: theme.colors.textStrong },
    headerStyle: ios ? undefined : { backgroundColor: theme.colors.surfacePage },
    headerShadowVisible: false,
    headerBackButtonDisplayMode: "minimal",
    contentStyle: { backgroundColor: theme.colors.surfacePage },
  };
}

/** Kořen tabu: na iOS velký titulek, který při scrollu přejde na standardní. */
export function largeTitleOptions(theme: Theme): NativeStackNavigationOptions {
  return { headerLargeTitleEnabled: theme.platform.isIOS };
}

/** Zavření modální úlohy: zpět, a po deep linku bez historie na Dnes. */
export function useCloseModal(
  fallback: Parameters<ReturnType<typeof useRouter>["replace"]>[0] = "/",
) {
  const router = useRouter();
  return () => {
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
  };
}
