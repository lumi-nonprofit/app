/* The overview: the week as dots (colour and shape are the mood, size is the intensity, an
   empty day is an outlined circle), patterns, the wellbeing index and the deeper screenings.
   Settings (research toggle, reminders, backup) has its own screen.
   The variants follow the data: an empty week has 0 or 1 entries, and a WHO-5 below 50 % shows
   the empathetic variant. No alarms, no guilt. */
import React from "react";
import { View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Badge, Button, Card, ListItem, ProgressRing, SegmentedControl, Text } from "../../ds";
import Screen from "../../components/Screen";
import { LumiHeader, SectionLabel } from "../../components/Header";
import { headerItems } from "../../components/HeaderItems";
import MoodShape from "../../components/MoodShape";
import { createThemedStyles, useTheme } from "../../theme";
import i18n, { useTranslation } from "../../i18n";
import { formatPercent, formatWeekdayDate } from "../../i18n/format";
import { INSTRUMENTS } from "../measure/definitions";
import {
  intensityLabel,
  type Intensity,
  MOODS,
  MOOD_BY_ID,
  WHO5_CADENCE_DAYS,
  buildMonth,
  buildWeek,
  daysBetween,
  latestWho5,
  toISODate,
  weekEntryCount,
  who5StatsText,
} from "../../model";
import type { WeekDay } from "../../model";
import { useEntries, useMeasurements } from "../../db/hooks";
import type { Measurement } from "../../db/repo";
import { gad7Band, phq9Band, type Band } from "../measure/scoring";
import InsightsCard from "./InsightsCard";
import type { Period } from "./insights";
import { isReflectionWindowOpen } from "./reflection";

interface DayDotProps {
  day: WeekDay;
}

/* A day as a dot: colour and shape are the mood, size is the intensity, an empty day is an
   outlined circle. */
function DayDot({ day }: DayDotProps) {
  const styles = useStyles();
  const { t } = useTranslation("stats");
  const mood = day.entry ? MOOD_BY_ID[day.entry.mood] : null;
  const size = day.entry ? 13 + day.entry.intensity * 3.4 : 14;
  /* `mood` exists exactly when `day.entry` exists; the condition narrows the types. */
  const label =
    day.entry && mood
      ? t("calendar.day.entry", {
          day: day.dayName,
          mood: mood.name,
          intensity: intensityLabel(day.entry.intensity),
        })
      : t("calendar.day.empty", { day: day.dayName });
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      accessibilityHint={t("calendar.day.a11yHint")}
      style={[styles.dayDot, { opacity: day.future ? 0.45 : 1 }]}
    >
      <View style={styles.dayDotShape}>
        {mood ? (
          <MoodShape mood={mood} size={size} />
        ) : (
          <MoodShape size={14} outline dashed={day.future} />
        )}
      </View>
      <Text
        variant="caption1"
        weight={day.today ? "bold" : "medium"}
        color={day.today ? "textAccent" : "textMuted"}
        maxFontSizeMultiplier={1.6}
      >
        {day.today ? t("calendar.today") : day.label}
      </Text>
    </View>
  );
}

function MoodLegend() {
  const styles = useStyles();
  const { t } = useTranslation("stats");
  return (
    <View style={styles.legend}>
      {MOODS.map((m) => (
        <View key={m.id} style={styles.legendItem}>
          <MoodShape mood={m} size={11} />
          <Text variant="caption1" weight="regular">
            {m.nameInSentence}
          </Text>
        </View>
      ))}
      <View style={styles.legendItem}>
        <MoodShape size={11} outline />
        <Text variant="caption1" weight="regular">
          {t("calendar.legendEmpty")}
        </Text>
      </View>
    </View>
  );
}

/** The subtitle of a deeper screening card: the last band and the trend, never a diagnosis. */
function deepSubtitle(
  list: Measurement[],
  questionCount: number,
  band: (s: number) => Band,
): string {
  if (!list.length) return i18n.t("stats:deep.intro", { count: questionCount });
  const last = list[list.length - 1];
  const prev = list.length > 1 ? list[list.length - 2].score : null;
  const label = band(last.score).label;
  if (prev === null) return i18n.t("stats:deep.last", { band: label });
  const diff = last.score - prev;
  if (diff === 0) return i18n.t("stats:deep.lastSame", { band: label });
  const amount = i18n.t("measure:trend.byPoints", { count: Math.abs(diff) });
  return diff > 0
    ? i18n.t("stats:deep.lastMore", { band: label, amount })
    : i18n.t("stats:deep.lastLess", { band: label, amount });
}

/** The label of a month cell: "pondělí 6. 10. — Napětí, silně" or "... — bez záznamu". */
function monthCellLabel(
  iso: string,
  entry: { mood: keyof typeof MOOD_BY_ID; intensity: number } | null,
): string {
  const day = formatWeekdayDate(iso);
  return entry
    ? i18n.t("stats:calendar.day.entry", {
        day,
        mood: MOOD_BY_ID[entry.mood].name,
        intensity: intensityLabel(entry.intensity as Intensity),
      })
    : i18n.t("stats:calendar.day.empty", { day });
}

export default function StatsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useTranslation("stats");
  /* The month view goes 4 calendar weeks back; a range of 35 days is enough. */
  const monthStart = new Date();
  monthStart.setDate(monthStart.getDate() - 35);
  const entries = useEntries({ from: toISODate(monthStart) });
  const who5 = useMeasurements("who5");

  const phq9 = useMeasurements("phq9");
  const gad7 = useMeasurements("gad7");

  const [period, setPeriod] = React.useState<Period>("week");
  const periods: { value: Period; label: string }[] = [
    { value: "week", label: t("period.week") },
    { value: "month", label: t("period.month") },
  ];
  const week = buildWeek(entries);
  const empty = weekEntryCount(entries) <= 1;
  const measurement = latestWho5(who5);
  const low = measurement ? measurement.score < 50 : false;
  const who5Due = measurement
    ? daysBetween(measurement.date, toISODate()) >= WHO5_CADENCE_DAYS
    : false;

  return (
    <Screen>
      <Stack.Screen
        options={headerItems(theme, {
          right: [
            {
              label: t("header.settings"),
              icon: "gear",
              sf: "gearshape",
              onPress: () => router.push("/settings"),
            },
          ],
        })}
      />
      <LumiHeader
        title={t("header.title")}
        trailing={
          <SegmentedControl
            options={periods}
            value={period}
            onChange={setPeriod}
            accessibilityLabel={t("period.a11yLabel")}
            accessibilityHint={t("period.a11yHint")}
          />
        }
      />

      {/* The mood calendar. */}
      <Card>
        <View style={styles.cardHead}>
          <Text accessibilityRole="header" variant="headline">
            {t("calendar.title")}
          </Text>
          <Badge>{t("calendar.badge", { context: period })}</Badge>
        </View>

        {empty ? (
          <View>
            <View style={styles.weekRow}>
              {week.map((d) => (
                <DayDot key={d.label} day={d} />
              ))}
            </View>
            <Text variant="body" style={styles.emptyText}>
              {t("calendar.emptyText")}
            </Text>
            <Button
              variant="secondary"
              size="sm"
              onPress={() => router.push("/checkin")}
              style={styles.selfStart}
            >
              {t("calendar.startCheckin")}
            </Button>
          </View>
        ) : period === "week" ? (
          <View style={styles.weekRow}>
            {week.map((d) => (
              <DayDot key={d.label} day={d} />
            ))}
          </View>
        ) : (
          <View style={styles.monthGrid}>
            {buildMonth(entries).map((row, w) => (
              <View key={w} style={styles.weekRow}>
                {row.map((d) => {
                  const m = d.entry ? MOOD_BY_ID[d.entry.mood] : null;
                  return (
                    <View
                      key={d.iso}
                      accessible
                      accessibilityRole="image"
                      accessibilityLabel={monthCellLabel(d.iso, d.entry)}
                      style={[styles.monthCell, { opacity: d.future ? 0.45 : 1 }]}
                    >
                      {/* `m` exists exactly when `d.entry` exists; the condition narrows the types. */}
                      {d.entry && m ? (
                        <MoodShape mood={m} size={8 + d.entry.intensity * 1.6} />
                      ) : (
                        <MoodShape size={10} outline />
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}
        {!empty ? <MoodLegend /> : null}
      </Card>

      {/* Local patterns from the entries of the chosen period. */}
      <InsightsCard entries={entries} period={period} />

      {/* The weekly reflection: the card shows only from Sunday 17:00 to the end of Monday. */}
      {isReflectionWindowOpen(new Date()) ? (
        <Card style={styles.deepCard}>
          <ListItem
            icon="sparkles"
            title={t("reflection.card.title")}
            subtitle={t("reflection.card.subtitle")}
            onPress={() => router.push("/reflection")}
          />
        </Card>
      ) : null}

      {/* The wellbeing index. */}
      <Card>
        <View style={styles.wellRow}>
          <ProgressRing
            value={measurement ? measurement.score / 100 : 0}
            size={84}
            color={low ? theme.colors.textInfo : undefined}
            label={measurement ? formatPercent(measurement.score) : t("wellbeing.noValue")}
            sublabel={t("wellbeing.sublabel")}
          />
          <View style={styles.wellBody}>
            <Text accessibilityRole="header" variant="headline">
              {t("wellbeing.title")}
            </Text>
            {!measurement ? (
              <View>
                <Text variant="subheadline" color="textMuted" style={styles.wellTextSpaced}>
                  {t("wellbeing.intro")}
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
            ) : low ? (
              <View>
                <Text variant="subheadline" color="textMuted" style={styles.wellTextSpaced}>
                  {t("wellbeing.low")}
                </Text>
                <View style={styles.lowActions}>
                  <Button variant="secondary" size="sm" onPress={() => router.push("/help")}>
                    {t("wellbeing.openHelp")}
                  </Button>
                  {who5Due ? (
                    <Button variant="ghost" size="sm" onPress={() => router.push("/measure/who5")}>
                      {t("wellbeing.questionnaire")}
                    </Button>
                  ) : null}
                </View>
              </View>
            ) : (
              <View>
                <Text
                  variant="subheadline"
                  color="textMuted"
                  style={[styles.wellText, who5Due ? styles.wellTextSpaced : null]}
                >
                  {who5StatsText(who5)}
                </Text>
                {who5Due ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={() => router.push("/measure/who5")}
                    style={styles.selfStart}
                  >
                    {t("wellbeing.questionnaire")}
                  </Button>
                ) : null}
              </View>
            )}
          </View>
        </View>
      </Card>

      {/* The deeper screenings: optional, never pushed, no notifications. */}
      <View>
        <SectionLabel>{t("deep.title")}</SectionLabel>
        <Card style={styles.deepCard}>
          <ListItem
            icon="cloud"
            tone="info"
            title={INSTRUMENTS.phq9.title}
            subtitle={deepSubtitle(phq9, INSTRUMENTS.phq9.questions.length, phq9Band)}
            onPress={() => router.push("/measure/phq9")}
          />
          <ListItem
            icon="waves"
            tone="info"
            title={INSTRUMENTS.gad7.title}
            subtitle={deepSubtitle(gad7, INSTRUMENTS.gad7.questions.length, gad7Band)}
            onPress={() => router.push("/measure/gad7")}
          />
        </Card>
        <Text variant="footnote" color="textMuted" style={styles.deepNote}>
          {t("deep.note")}
        </Text>
      </View>
    </Screen>
  );
}

const useStyles = createThemedStyles((t) => ({
  selfStart: { alignSelf: "flex-start" },
  dayDot: { flex: 1, alignItems: "center", gap: 7 },
  dayDotShape: { height: 32, alignItems: "center", justifyContent: "center" },

  cardHead: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 12,
  },

  weekRow: { flexDirection: "row", gap: 4 },
  monthGrid: { gap: 10 },
  monthCell: { flex: 1, flexDirection: "row", justifyContent: "center" },

  emptyText: { marginTop: 16, marginBottom: 12 },

  legend: { flexDirection: "row", gap: 12, flexWrap: "wrap", marginTop: 14 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },

  wellRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  wellBody: { flex: 1 },
  wellText: { marginTop: 2 },
  wellTextSpaced: { marginTop: 2, marginBottom: 10 },
  lowActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignSelf: "flex-start" },
  deepCard: { paddingVertical: 8, paddingHorizontal: 12, marginTop: 6 },
  deepNote: { marginTop: 8, paddingHorizontal: 4 },
}));
