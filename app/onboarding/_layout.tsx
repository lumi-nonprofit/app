/* The onboarding stack: 3 steps as separate routes, without a tab bar. Hardware back: step 2
   or 3 goes to the previous step; from the first step it leaves the app. */
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
