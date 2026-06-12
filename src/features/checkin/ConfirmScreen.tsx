/* Check-in · potvrzení — rodově neutrální, s kontextovým tipem podle stavu
   (jeden zdroj: RECOMMENDATIONS v model.ts). */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Badge, Button, Card, Icon, ListItem } from "../../ds/index";
import { SectionLabel } from "../../components/Header";
import Screen from "../../components/Screen";
import { lastEntryForDate, recommendationForMood, toISODate } from "../../model";
import type { MoodId } from "../../model";
import { useAppStore } from "../../store";
import { palette, colors, font, leading, tracking, shadow, type } from "../../theme";
import { useCheckinDraft } from "./draft";

export default function ConfirmScreen() {
  const router = useRouter();
  const { draft } = useCheckinDraft();
  const { state } = useAppStore();
  const moodId: MoodId =
    draft.mood ?? lastEntryForDate(state.entries, toISODate())?.mood ?? "napeti";
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
          <Icon name="check" size={36} strokeWidth={2.2} color={palette.sun700} />
        </View>
        <View>
          <Text accessibilityRole="header" style={styles.confirmTitle}>
            Uloženo.
          </Text>
          <Text style={styles.confirmBody}>
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
            iconTint={tip.iconTint}
            iconColor={tip.iconColor}
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

const styles = StyleSheet.create({
  center: { justifyContent: "center" },
  confirmHero: { alignItems: "center", gap: 16 },
  confirmCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.glow,
  },
  confirmTitle: {
    ...font.display(700),
    fontSize: type.xxl,
    lineHeight: leading.tight(type.xxl),
    letterSpacing: tracking.display(type.xxl),
    color: colors.textStrong,
    textAlign: "center",
    marginBottom: 8,
  },
  confirmBody: {
    ...font.body(400),
    fontSize: type.base,
    lineHeight: leading.body(type.base),
    color: colors.textBody,
    textAlign: "center",
  },
  tipBlock: { marginTop: 28 },
  tipCard: { paddingVertical: 8, paddingHorizontal: 12, marginTop: 6 },
  homeBlock: { marginTop: 16 },
});
