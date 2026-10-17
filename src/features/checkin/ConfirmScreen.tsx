/* Check-in · potvrzení — rodově neutrální, s kontextovým tipem podle stavu
   (jeden zdroj: RECOMMENDATIONS v model.ts). */
import React from "react";
import { View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Badge, Button, Card, Icon, ListItem, Text } from "../../ds";
import { SectionLabel } from "../../components/Header";
import Screen from "../../components/Screen";
import { lastEntryForDate, recommendationForMood, toISODate } from "../../model";
import type { MoodId } from "../../model";
import { useEntries } from "../../db/hooks";
import { createThemedStyles, useTheme } from "../../theme";
import { useCheckinDraft } from "./draft";

export default function ConfirmScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useStyles();
  const { draft } = useCheckinDraft();
  const today = toISODate();
  const todayEntries = useEntries({ from: today, to: today });
  const moodId: MoodId = draft.mood ?? lastEntryForDate(todayEntries, today)?.mood ?? "napeti";
  const tip = recommendationForMood(moodId);

  const goHome = () => {
    router.dismissAll();
    router.navigate("/");
  };
  const openTip = () => {
    router.dismissAll();
    router.navigate(tip.route as Href);
  };

  return (
    <Screen contentStyle={styles.center}>
      <View style={styles.confirmHero}>
        <View style={styles.confirmCircle}>
          <Icon name="check" size={36} strokeWidth={2.2} color={theme.colors.textAccent} />
        </View>
        <View>
          <Text accessibilityRole="header" variant="title1" align="center" style={styles.title}>
            Uloženo.
          </Text>
          <Text variant="body" align="center">
            Tohle byla chvilka pro tebe.
            {"\n"}
            Záznam zůstává v telefonu.
          </Text>
        </View>
      </View>

      <View style={styles.tipBlock}>
        <SectionLabel>Mohlo by teď sednout</SectionLabel>
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
          Zpět na Dnes
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
