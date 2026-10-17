/* Pomoc — vlastní stack tabu: pomoc → sekce krizového plánu (push, systémové Zpět). */
import { Stack } from "expo-router";
import { largeTitleOptions, stackScreenOptions } from "../../../src/components/navigation";
import { useTheme } from "../../../src/theme";

export const unstable_settings = { anchor: "help" };

export default function HelpStackLayout() {
  const theme = useTheme();
  return (
    <Stack screenOptions={stackScreenOptions(theme)}>
      <Stack.Screen name="help" options={{ title: "Pomoc", ...largeTitleOptions(theme) }} />
      <Stack.Screen name="plan/[section]" options={{ title: "Krizový plán" }} />
    </Stack>
  );
}
