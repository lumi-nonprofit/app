/* Onboarding stack — tři kroky jako samostatné routes, bez tab baru.
   Hardware back: krok 2/3 → předchozí krok; z prvního kroku ven z aplikace. */
import { Stack } from "expo-router";
import { useTheme } from "../../src/theme";

export default function OnboardingLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.surfacePage },
      }}
    />
  );
}
