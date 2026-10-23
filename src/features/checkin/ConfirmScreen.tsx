/* Check-in, confirmation: gender-neutral, with a contextual tip by the state (one source:
   RECOMMENDATIONS in model.ts). */
import React from "react";
import { View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Badge, Button, Card, Icon, ListItem, Text } from "../../ds";
import { SectionLabel } from "../../components/Header";
import Screen from "../../components/Screen";
import { useTranslation } from "../../i18n";
import { lastEntryForDate, recommendationForMood, toISODate } from "../../model";
import type { MoodId } from "../../model";
import { useEntries } from "../../db/hooks";
import { announce } from "../../lib/a11y";
import { createThemedStyles, useTheme } from "../../theme";
import { useCheckinDraft } from "./draft";

export default function ConfirmScreen() {
  const { t } = useTranslation("checkin");
  const router = useRouter();
  const theme = useTheme();
  const styles = useStyles();
  const { draft } = useCheckinDraft();
  const today = toISODate();
  const todayEntries = useEntries({ from: today, to: today });
  const moodId: MoodId = draft.mood ?? lastEntryForDate(todayEntries, today)?.mood ?? "napeti";
  const tip = recommendationForMood(moodId);
  React.useEffect(() => {
    announce(t("confirm.announce"));
  }, [t]);

  /* expo-router 58: `dismissTo` closes the sheet and opens the target. The old pair of
     dismissAll() and navigate() kept the sheet in the stack, under a new copy of the tabs. */
  const goHome = () => router.dismissTo("/");
  const openTip = () => router.dismissTo(tip.route as Href);

  return (
    <Screen contentStyle={styles.center}>
      <View style={styles.confirmHero}>
        <View style={styles.confirmCircle}>
          <Icon name="check" size={36} weight="semibold" color={theme.colors.textAccent} />
        </View>
        <View>
          <Text accessibilityRole="header" variant="title1" align="center" style={styles.title}>
            {t("confirm.title")}
          </Text>
          <Text variant="body" align="center">
            {t("confirm.moment")}
            {"\n"}
            {t("confirm.stays")}
          </Text>
        </View>
      </View>

      <View style={styles.tipBlock}>
        <SectionLabel>{t("confirm.tipTitle")}</SectionLabel>
        <Card style={styles.tipCard}>
          <ListItem
            icon={tip.icon}
            tone={tip.tone}
            title={tip.title}
            subtitle={tip.subtitle}
            trailing={tip.badge ? <Badge tone={tip.badge[0]}>{tip.badge[1]}</Badge> : null}
            onPress={openTip}
          />
        </Card>
      </View>

      <View style={styles.homeBlock}>
        <Button variant="secondary" size="lg" fullWidth onPress={goHome}>
          {t("confirm.home")}
        </Button>
      </View>
    </Screen>
  );
}

const useStyles = createThemedStyles((t) => ({
  center: { justifyContent: "center" },
  confirmHero: { alignItems: "center", gap: 16 },
  confirmCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: t.colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { marginBottom: 8 },
  tipBlock: { marginTop: 28 },
  tipCard: { paddingVertical: 8, paddingHorizontal: 12, marginTop: 6 },
  homeBlock: { marginTop: 16 },
}));
