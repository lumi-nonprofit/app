/* Check-in stack (modálně nad taby): krok 1 → krok 2 → potvrzení.
   Draft žije jen v provideru tohoto stacku — každé otevření začíná čistě
   a nic z rozpracovaného zápisu se nepersistuje. Hlavička podle HIG Sheets:
   Zrušit vlevo na prvním kroku, systémové Zpět na druhém, Hotovo vpravo na
   potvrzení (bez Zpět — zápis už je uložený). */
import { Stack, useRouter } from "expo-router";
import { CheckinDraftProvider } from "../../src/features/checkin/draft";
import { closeItem, headerItems } from "../../src/components/HeaderItems";
import { stackScreenOptions } from "../../src/components/navigation";
import { useTheme } from "../../src/theme";

export default function CheckinLayout() {
  const theme = useTheme();
  const router = useRouter();
  const finish = () => {
    router.dismissAll();
    router.navigate("/");
  };
  return (
    <CheckinDraftProvider>
      <Stack screenOptions={stackScreenOptions(theme)}>
        <Stack.Screen
          name="index"
          options={{
            title: "Check-in",
            ...headerItems(theme, {
              left: [
                theme.platform.isIOS
                  ? { label: "Zrušit", onPress: () => router.dismiss() }
                  : closeItem(() => router.dismiss(), "Zrušit"),
              ],
            }),
          }}
        />
        <Stack.Screen name="words" options={{ title: "Check-in", headerBackTitle: "Krok 1" }} />
        <Stack.Screen
          name="confirm"
          options={{
            title: "Uloženo",
            headerBackVisible: false,
            gestureEnabled: false,
            ...headerItems(theme, {
              right: [{ label: "Hotovo", prominent: true, onPress: finish }],
            }),
          }}
        />
      </Stack>
    </CheckinDraftProvider>
  );
}
