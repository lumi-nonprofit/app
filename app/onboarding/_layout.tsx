/* Onboarding stack — tři kroky jako samostatné routes, bez tab baru.
   Hardware back: krok 2/3 → předchozí krok; z prvního kroku ven z aplikace. */
import { Stack } from "expo-router";
import { colors } from "../../src/theme";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surfacePage } }}
    />
  );
}
