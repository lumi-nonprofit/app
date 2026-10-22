/* The check-in stack (modal over the tabs): step 1, step 2, confirmation. The draft lives only
   in the provider of this stack: each open starts empty, and nothing of the unsaved entry
   persists. The header follows HIG Sheets. Step 1 has "Zrušit" on the left, step 2 the system
   back button. The confirmation has "Hotovo" on the right and no back button: the entry is
   already in the database. */
import { Stack, useRouter } from "expo-router";
import { CheckinDraftProvider } from "../../src/features/checkin/draft";
import { closeItem, headerItems } from "../../src/components/HeaderItems";
import { stackScreenOptions } from "../../src/components/navigation";
import { useTranslation } from "../../src/i18n";
import { useTheme } from "../../src/theme";

export default function CheckinLayout() {
  const { t } = useTranslation("navigation");
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
            title: t("titles.checkin"),
            ...headerItems(theme, {
              left: [
                theme.platform.isIOS
                  ? { label: t("actions.cancel"), onPress: () => router.dismiss() }
                  : closeItem(() => router.dismiss(), t("actions.cancel")),
              ],
            }),
          }}
        />
        <Stack.Screen
          name="words"
          options={{ title: t("titles.checkin"), headerBackTitle: t("titles.checkinStep1") }}
        />
        <Stack.Screen
          name="confirm"
          options={{
            title: t("titles.checkinSaved"),
            headerBackVisible: false,
            gestureEnabled: false,
            ...headerItems(theme, {
              right: [{ label: t("actions.done"), prominent: true, onPress: finish }],
            }),
          }}
        />
      </Stack>
    </CheckinDraftProvider>
  );
}
