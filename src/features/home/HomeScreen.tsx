/* "Dnes": the home screen. The states follow the data. Without a WHO-5 measurement the card
   shows the call to the first questionnaire instead of the percentage (the "first day" variant).
   After an entry today the check-in card turns into a summary. */
import { View } from "react-native";
import { Stack, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { Badge, Button, Card, Icon, ListItem, ProgressRing, Text } from "../../ds";
import { LumiHeader, SectionLabel } from "../../components/Header";
import { headerItems } from "../../components/HeaderItems";
import MoodShape from "../../components/MoodShape";
import Screen from "../../components/Screen";
import { useTranslation } from "../../i18n";
import { formatPercent, formatStoredTime } from "../../i18n/format";
import {
  MOOD_BY_ID,
  RECOMMENDATIONS,
  greeting,
  todayHeading,
  lastEntryForDate,
  latestWho5,
  toISODate,
  who5HomeText,
  wordLabel,
} from "../../model";
import { INSTRUMENTS } from "../measure/definitions";
import { useAppStore } from "../../store";
import { useEntries, useMeasurements } from "../../db/hooks";
import { createThemedStyles, useTheme } from "../../theme";

export default function HomeScreen() {
  const { t } = useTranslation(["home", "common"]);
  const { state } = useAppStore();
  const router = useRouter();
  const theme = useTheme();
  const styles = useStyles();
  const name = state.name.trim();
  const today = toISODate();
  const todayEntry = lastEntryForDate(useEntries({ from: today, to: today }), today);
  const who5 = useMeasurements("who5");

  const startCheckin = () => router.push("/checkin");
  const openSettings = () => router.push("/settings");
  const openHelp = () => router.push("/help");
  const openStats = () => router.push("/stats");

  const todayMood = todayEntry ? MOOD_BY_ID[todayEntry.mood] : null;
  /* The words of the entry of today, as one list in the active language. */
  const todayWords = todayEntry?.words.map(wordLabel).join(t("common:list.separator")) ?? "";
  const measurement = latestWho5(who5);
  const questionCount = t("common:counts.questions", {
    count: INSTRUMENTS.who5.questions.length,
  });
  return (
    <Screen>
      {/* "+" in the header: the check-in is an action, not a tab (HIG Tab bars); the settings sit outside the main navigation. */}
      <Stack.Screen
        options={headerItems(theme, {
          right: [
            { label: t("header.newCheckin"), icon: "plus", sf: "plus", onPress: startCheckin },
            { label: t("header.settings"), icon: "gear", sf: "gearshape", onPress: openSettings },
          ],
        })}
      />
      <LumiHeader kicker={todayHeading()} title={greeting(name)} />

      {/* The check-in card (dominant). */}
      {todayEntry && todayMood ? (
        <Card variant="sunken">
          <View style={styles.entryRow}>
            <MoodShape mood={todayMood} size={22} />
            <View style={styles.flex1}>
              <Text variant="body" weight="semibold" color="textStrong">
                {todayWords
                  ? t("entry.summaryWithWords", { mood: todayMood.name, words: todayWords })
                  : t("entry.summary", { mood: todayMood.name })}
              </Text>
              <Text variant="footnote" color="textOnSunken">
                {t("entry.meta", { time: formatStoredTime(todayEntry.time) })}
              </Text>
            </View>
          </View>
          <View style={styles.entryActions}>
            <Button variant="ghost" size="sm" onPress={startCheckin} style={styles.selfStart}>
              {t("entry.addAnother")}
            </Button>
          </View>
        </Card>
      ) : (
        <Card variant="ink">
          {/* The ink card: text on the primary surface does not inherit, the colour is explicit. */}
          <Text variant="title3" color="textOnPrimary" style={styles.inkTitle}>
            {t("checkin.title")}
          </Text>
          <Text variant="body" color="textOnPrimary" style={styles.inkText}>
            {t("checkin.body")}
          </Text>
          <Button variant="soft" onPress={startCheckin} style={styles.selfStart}>
            {t("checkin.start")}
          </Button>
        </Card>
      )}

      {/* The wellbeing index. */}
      {measurement ? (
        <Card onPress={openStats}>
          <View style={styles.ringRow}>
            <ProgressRing
              value={measurement.score / 100}
              size={78}
              label={formatPercent(measurement.score)}
              sublabel={t("wellbeing.ringLabel")}
            />
            <View style={styles.flex1}>
              <Text accessibilityRole="header" variant="headline">
                {INSTRUMENTS.who5.title}
              </Text>
              <Text variant="subheadline" color="textMuted">
                {who5HomeText(who5)}
              </Text>
            </View>
          </View>
        </Card>
      ) : (
        <Card>
          <View style={styles.ringRow}>
            <ProgressRing
              value={0}
              size={78}
              label={t("wellbeing.noScore")}
              sublabel={t("wellbeing.ringLabel")}
            />
            <View style={styles.flex1}>
              <Text accessibilityRole="header" variant="headline">
                {INSTRUMENTS.who5.title}
              </Text>
              <Text variant="subheadline" color="textMuted" style={styles.ringTextEmpty}>
                {t("wellbeing.emptyBody", { questions: questionCount })}
              </Text>
              <Button
                variant="secondary"
                size="sm"
                onPress={() => router.push("/measure/who5")}
                style={styles.selfStart}
              >
                {t("wellbeing.firstQuestionnaire")}
              </Button>
            </View>
          </View>
        </Card>
      )}

      {/* "Pro tebe": the recommendations. */}
      <View>
        <SectionLabel>{t("forYou.title")}</SectionLabel>
        <Card style={styles.listCard}>
          {RECOMMENDATIONS.map((rec) => (
            <ListItem
              key={rec.id}
              icon={rec.icon}
              tone={rec.tone}
              title={rec.title}
              subtitle={rec.subtitle}
              trailing={rec.badge ? <Badge tone={rec.badge[0]}>{rec.badge[1]}</Badge> : null}
              onPress={() => router.navigate(rec.route as Href)}
            />
          ))}
        </Card>
      </View>

      {/* The crisis card: gently different, not an alarm. */}
      <View style={styles.crisisSection}>
        <View style={styles.crisisHeader}>
          <Icon name="heart-handshake" size={20} color={theme.colors.textDanger} />
          <Text
            accessibilityRole="header"
            variant="headline"
            color="textDanger"
            style={styles.flex1}
          >
            {t("crisis.title")}
          </Text>
        </View>
        <Text variant="body" style={styles.crisisText}>
          {t("crisis.body")}
        </Text>
        <Button variant="crisis" onPress={openHelp} style={styles.selfStart}>
          <Icon name="heart-handshake" size={18} color={theme.colors.textOnCrisis} />
          {t("crisis.open")}
        </Button>
      </View>
    </Screen>
  );
}

const useStyles = createThemedStyles((t) => ({
  flex1: { flex: 1 },
  selfStart: { alignSelf: "flex-start" },

  /* The summary of the entry of today. */
  entryRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  entryActions: { marginTop: 12 },

  /* The ink card: the call to the check-in. */
  inkTitle: { marginBottom: 4 },
  inkText: { marginBottom: 16 },

  /* The wellbeing index. */
  ringRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  ringTextEmpty: { marginTop: 2, marginBottom: 10 },

  /* "Pro tebe". */
  listCard: { paddingVertical: 8, paddingHorizontal: 12, marginTop: 6 },

  /* The crisis card. */
  crisisSection: {
    backgroundColor: t.colors.dangerSoft,
    borderRadius: t.radius.lg,
    padding: t.space.s5,
  },
  crisisHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  crisisText: { marginBottom: 14 },
}));
