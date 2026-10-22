/* Handover of the phone (app/handover, fullScreenModal): a full-screen mode for a third person
   who holds the phone in place of the user.

   Intent, formal register: this is the only screen where the informal "you" makes no sense. The
   text speaks to someone other than the user (they hold the phone for them), so the Czech text
   uses the formal register ("vykání") everywhere. No pressure, no blame: calm, concrete
   instructions.

   No personal data: the screen leaves out useAppStore, useEntries and useMeasurements on
   purpose. No name, no entries. The crisis numbers come from lines.ts and do not depend on the
   profile. */
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Text } from "../../ds";
import Screen from "../../components/Screen";
import { useTranslation } from "../../i18n";
import { createThemedStyles } from "../../theme";
import { HELP_LINES, LINE_BY_ID, telHref } from "./lines";

function Principle({ text }: { text: string }) {
  const styles = useStyles();
  return (
    <View style={styles.principleRow}>
      {/* The dot is decorative: the text next to it carries the meaning. */}
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.dot}
      />
      {/* Large type: a stranger holds the phone, often under stress. */}
      <Text variant="title3" style={styles.principleText}>
        {text}
      </Text>
    </View>
  );
}

export default function HandoverScreen() {
  const { t } = useTranslation("help");
  const router = useRouter();
  const styles = useStyles();
  /* The 5 principles, each as its own row with a dot. The information is never only in colour:
     the text carries it, the dot is a visual bullet. A few words each. */
  const principles = [
    t("handover.principles.stayClose"),
    t("handover.principles.listen"),
    t("handover.principles.noAdvice"),
    t("handover.principles.takeSeriously"),
    t("handover.principles.stayWith"),
  ];
  const adults = HELP_LINES.plus27;
  const youth = HELP_LINES.u26;
  const ambulance = LINE_BY_ID.zachranka;
  const emergency = LINE_BY_ID.tisen;
  return (
    <Screen contentStyle={styles.content}>
      <Text accessibilityRole="header" variant="title1">
        {t("handover.title")}
      </Text>

      <View style={styles.principles}>
        {principles.map((p) => (
          <Principle key={p} text={p} />
        ))}
      </View>

      <View style={styles.actions}>
        {/* The crisis lines: the numbers come from lines.ts and do not depend on the profile. */}
        <Button variant="crisis" size="lg" fullWidth href={telHref(adults.phone)}>
          {t("handover.callAdults", { phone: adults.phone })}
        </Button>
        <Button variant="crisis" size="lg" fullWidth href={telHref(youth.phone)}>
          {t("handover.callYouth", { phone: youth.phone })}
        </Button>

        {/* High contrast: the emergency numbers must be readable at first sight. */}
        <Text
          variant="title3"
          weight="bold"
          color="textDanger"
          align="center"
          style={styles.emergency}
        >
          {t("handover.emergency", { ambulance: ambulance.phone, emergency: emergency.phone })}
        </Text>

        <Button variant="secondary" size="lg" fullWidth onPress={() => router.back()}>
          {t("handover.return")}
        </Button>
      </View>
    </Screen>
  );
}

const useStyles = createThemedStyles((t) => ({
  content: { gap: 24, justifyContent: "center" },

  principles: { gap: 14 },
  principleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surfaceCrisis,
  },
  principleText: { flex: 1 },

  actions: { gap: 12 },
  emergency: { marginVertical: 4 },
}));
