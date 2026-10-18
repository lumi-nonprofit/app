/* "Dnes": the own stack of the tab (the tab bar stays visible on further screens). */
import { Stack } from "expo-router";
import { largeTitleOptions, stackScreenOptions } from "../../../src/components/navigation";
import { useTranslation } from "../../../src/i18n";
import { useTheme } from "../../../src/theme";

export const unstable_settings = { anchor: "index" };

export default function HomeStackLayout() {
  const { t } = useTranslation("navigation");
  const theme = useTheme();
  return (
    <Stack screenOptions={stackScreenOptions(theme)}>
      <Stack.Screen
        name="index"
        options={{ title: t("titles.home"), ...largeTitleOptions(theme) }}
      />
    </Stack>
  );
}
