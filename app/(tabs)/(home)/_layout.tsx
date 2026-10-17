/* Dnes — vlastní stack tabu (tab bar zůstává viditelný i při dalších obrazovkách). */
import { Stack } from "expo-router";
import { largeTitleOptions, stackScreenOptions } from "../../../src/components/navigation";
import { useTheme } from "../../../src/theme";

export const unstable_settings = { anchor: "index" };

export default function HomeStackLayout() {
  const theme = useTheme();
  return (
    <Stack screenOptions={stackScreenOptions(theme)}>
      <Stack.Screen name="index" options={{ title: "Dnes", ...largeTitleOptions(theme) }} />
    </Stack>
  );
}
