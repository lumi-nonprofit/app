/* "Přehledy": the own stack of the tab: the overviews, then the weekly reflection (push, the
   system back button). */
import { Stack } from "expo-router";
import { largeTitleOptions, stackScreenOptions } from "../../../src/components/navigation";
import { useTranslation } from "../../../src/i18n";
import { useTheme } from "../../../src/theme";

export const unstable_settings = { anchor: "stats" };

export default function StatsStackLayout() {
  const { t } = useTranslation("navigation");
  const theme = useTheme();
  return (
    <Stack screenOptions={stackScreenOptions(theme)}>
      <Stack.Screen
        name="stats"
        options={{ title: t("titles.stats"), ...largeTitleOptions(theme) }}
      />
      <Stack.Screen name="reflection" options={{ title: t("titles.reflection") }} />
    </Stack>
  );
}
