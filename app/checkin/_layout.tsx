/* Check-in stack (modálně nad taby): krok 1 → krok 2 → potvrzení.
   Draft žije jen v provideru tohoto stacku — každé otevření začíná čistě
   a nic z rozpracovaného zápisu se nepersistuje. */
import { Stack } from "expo-router";
import { CheckinDraftProvider } from "../../src/features/checkin/draft";
import { useTheme } from "../../src/theme";

export default function CheckinLayout() {
  const theme = useTheme();
  return (
    <CheckinDraftProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.surfacePage },
        }}
      />
    </CheckinDraftProvider>
  );
}
