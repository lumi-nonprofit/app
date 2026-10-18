/* "Klid": the own stack of the tab; the player (calm/[id]) is a full-screen modal in the root. */
import { Stack } from "expo-router";
import { largeTitleOptions, stackScreenOptions } from "../../../src/components/navigation";
import { useTranslation } from "../../../src/i18n";
import { useTheme } from "../../../src/theme";

export const unstable_settings = { anchor: "calm" };

export default function CalmStackLayout() {
  const { t } = useTranslation("navigation");
  const theme = useTheme();
  return (
    <Stack screenOptions={stackScreenOptions(theme)}>
      <Stack.Screen name="calm" options={{ title: t("titles.calm"), ...largeTitleOptions(theme) }} />
    </Stack>
  );
}
