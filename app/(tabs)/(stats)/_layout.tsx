/* Přehledy — vlastní stack tabu: přehledy → ohlédnutí za týdnem (push, systémové Zpět). */
import { Stack } from "expo-router";
import { largeTitleOptions, stackScreenOptions } from "../../../src/components/navigation";
import { useTheme } from "../../../src/theme";

export const unstable_settings = { anchor: "stats" };

export default function StatsStackLayout() {
  const theme = useTheme();
  return (
    <Stack screenOptions={stackScreenOptions(theme)}>
      <Stack.Screen name="stats" options={{ title: "Přehledy", ...largeTitleOptions(theme) }} />
      <Stack.Screen name="reflection" options={{ title: "Ohlédnutí" }} />
    </Stack>
  );
}
