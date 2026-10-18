/* /crisis: modal help outside the onboarding guard. Static lines, no profile, no database. The
   screen is available from the onboarding and from anywhere through a deep link. */
import { Text } from "../../ds";
import Screen from "../../components/Screen";
import { useTranslation } from "../../i18n";
import CrisisLines from "./CrisisLines";

export default function CrisisScreen() {
  const { t } = useTranslation("help");
  return (
    <Screen>
      <Text accessibilityRole="header" variant="title2">
        {t("screen.title")}
      </Text>
      <Text variant="body">{t("crisis.lead")}</Text>
      <CrisisLines />
    </Screen>
  );
}
