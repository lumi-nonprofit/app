/* The check-in stack (modal over the tabs): step 1, step 2, confirmation. The draft lives only
   in the provider of this stack: each open starts empty, and nothing of the unsaved entry
   persists. The header follows HIG Sheets. Step 1 has "Zrušit" on the left, step 2 the system
   back button. The confirmation has "Hotovo" on the right and no back button: the entry is
   already in the database. */
import { Stack, useRouter } from "expo-router";
import {
  CheckinDraftProvider,
  isDraftDirty,
  useCheckinDraft,
} from "../../src/features/checkin/draft";
import { closeItem, headerItems } from "../../src/components/HeaderItems";
import { stackScreenOptions } from "../../src/components/navigation";
import { useTranslation } from "../../src/i18n";
import { useDiscardGuard } from "../../src/lib/useDiscardGuard";
import { useTheme } from "../../src/theme";

/* "Zrušit", the swipe-down and the hardware back button close the whole sheet. They ask first
   when the entry has content; a step inside the sheet does not ask. The sheet has 1 guard:
   expo-router 58 asks each guarded screen that an action removes, so 2 guards ask 2 times. */
function SheetDiscardGuard() {
  const { t } = useTranslation("checkin");
  const { draft, saved } = useCheckinDraft();
  useDiscardGuard({
    dirty: !saved && isDraftDirty(draft),
    title: t("discard.title"),
    message: t("discard.message"),
  });
  return null;
}

export default function CheckinLayout() {
  const { t } = useTranslation("navigation");
  const theme = useTheme();
  const router = useRouter();
  /* `dismissTo` closes the sheet (see ConfirmScreen). */
  const finish = () => router.dismissTo("/");
  return (
    <CheckinDraftProvider>
      <SheetDiscardGuard />
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
