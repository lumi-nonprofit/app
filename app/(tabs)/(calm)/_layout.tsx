/* Klid — vlastní stack tabu; přehrávač (calm/[id]) je celoobrazovkový modal v kořeni. */
import { Stack } from "expo-router";
import { largeTitleOptions, stackScreenOptions } from "../../../src/components/navigation";
import { useTheme } from "../../../src/theme";

export const unstable_settings = { anchor: "calm" };

export default function CalmStackLayout() {
  const theme = useTheme();
  return (
    <Stack screenOptions={stackScreenOptions(theme)}>
      <Stack.Screen name="calm" options={{ title: "Klid", ...largeTitleOptions(theme) }} />
    </Stack>
  );
}
