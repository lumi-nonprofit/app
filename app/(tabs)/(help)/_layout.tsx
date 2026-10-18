/* "Pomoc": the own stack of the tab: the help, then a section of the crisis plan (push, the
   system back button). */
import { Stack } from "expo-router";
import { largeTitleOptions, stackScreenOptions } from "../../../src/components/navigation";
import { useTranslation } from "../../../src/i18n";
import { useTheme } from "../../../src/theme";

export const unstable_settings = { anchor: "help" };

export default function HelpStackLayout() {
  const { t } = useTranslation("navigation");
  const theme = useTheme();
  return (
    <Stack screenOptions={stackScreenOptions(theme)}>
      <Stack.Screen name="help" options={{ title: t("titles.help"), ...largeTitleOptions(theme) }} />
      <Stack.Screen name="plan/[section]" options={{ title: t("titles.plan") }} />
    </Stack>
  );
}
