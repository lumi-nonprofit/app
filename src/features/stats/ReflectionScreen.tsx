/* The weekly reflection: a calm summary of the reflected week (on Sunday the week that ends,
   otherwise the last complete week): the dots of the days, the number of entries, the most
   frequent words and at most 2 insights. No score, no comparison: only what is there, and a
   thank-you for the attention. */
import React from "react";
import { View } from "react-native";
import { Card, Text } from "../../ds";
import Screen from "../../components/Screen";
import { LumiHeader, SectionLabel } from "../../components/Header";
import MoodShape from "../../components/MoodShape";
import { useEntries } from "../../db/hooks";
import { useTranslation } from "../../i18n";
import { computeInsights, tooFewDataText } from "./insights";
import { reflectionWeekRange } from "./reflection";
import { InsightRow } from "./InsightsCard";
import {
  MOOD_BY_ID,
  aggregateDay,
  intensityLabel,
  toISODate,
  weekdayLetters,
  weekdayNames,
  wordLabel,
  type Entry,
  type ISODate,
} from "../../model";
import { createThemedStyles } from "../../theme";

/** The 7 ISO days of the reflected week from the Monday `from`; noon because of daylight time. */
function weekDates(from: ISODate): ISODate[] {
  const monday = new Date(`${from}T12:00:00`);
  return weekdayLetters().map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toISODate(d);
  });
}

/** The most frequent words of the week (at most 3), by the number of occurrences. */
function topWords(entries: Entry[]): string[] {
  const counts = new Map<string, number>();
  for (const e of entries) for (const w of e.words) counts.set(w, (counts.get(w) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([w]) => w);
}

interface ReflectionDayProps {
  index: number;
  dayEntries: Entry[];
}

/* A day as a dot, with the same code as the overview: colour and shape are the mood, size is
   the intensity, an empty day is an outlined circle (never colour alone). */
function ReflectionDay({ index, dayEntries }: ReflectionDayProps) {
  const styles = useStyles();
  const { t } = useTranslation("stats");
  const agg = aggregateDay(dayEntries);
  const mood = agg ? MOOD_BY_ID[agg.mood] : null;
  /* `mood` exists exactly when `agg` exists; the condition narrows the types. */
  const dayName = weekdayNames()[index];
  const label =
    agg && mood
      ? t("calendar.day.entry", {
          day: dayName,
          mood: mood.name,
          intensity: intensityLabel(agg.intensity),
        })
      : t("calendar.day.empty", { day: dayName });
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      accessibilityHint={t("calendar.day.a11yHint")}
      style={styles.day}
    >
      <View style={styles.dayShape}>
        {agg && mood ? (
          <MoodShape mood={mood} size={13 + agg.intensity * 3.4} />
        ) : (
          <MoodShape size={14} outline />
        )}
      </View>
      <Text variant="caption1" maxFontSizeMultiplier={1.6}>
        {weekdayLetters()[index]}
      </Text>
    </View>
  );
}

export default function ReflectionScreen() {
  const styles = useStyles();
  const { t } = useTranslation("stats");
  /* The moment of the open keeps the range and the title stable for the life of the screen. */
  const [now] = React.useState(() => new Date());
  const range = reflectionWeekRange(now);
  const entries = useEntries(range);
  const days = weekDates(range.from);
  const count = entries.length;
  const words = React.useMemo(() => topWords(entries), [entries]);
  /* At most 2 insights in the reflection: the summary stays short and calm. */
  const insights = computeInsights(entries, "week").slice(0, 2);

  return (
    <Screen>
      {/* On Sunday the reflection looks at the week that ends; "last week" would confuse.
          The native header carries the title "Ohlédnutí" and the back button. */}
      <LumiHeader
        title={now.getDay() === 0 ? t("reflection.titleCurrent") : t("reflection.titleLast")}
      />

      {/* The dots of the days and the number of entries. */}
      <Card>
        <View style={styles.weekRow}>
          {days.map((iso, i) => (
            <ReflectionDay key={iso} index={i} dayEntries={entries.filter((e) => e.date === iso)} />
          ))}
        </View>
        <Text variant="subheadline" weight="medium" color="textMuted" style={styles.countText}>
          {t("reflection.total", { count })}
        </Text>
      </Card>

      {/* The most frequent words, only when there are some. */}
      {words.length ? (
        <View>
          <SectionLabel>{t("reflection.topWords")}</SectionLabel>
          <Card style={styles.wordsCard}>
            <View style={styles.wordsRow}>
              {words.map((w) => (
                <View key={w} style={styles.wordPill}>
                  <Text variant="subheadline" weight="medium" color="textOnSunken">
                    {wordLabel(w)}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </View>
      ) : null}

      {/* At most 2 insights; below the data threshold a gentle encouragement. */}
      <View>
        <SectionLabel>{t("reflection.insightsTitle")}</SectionLabel>
        <Card style={styles.insightsCard}>
          {insights.length ? (
            insights.map((i) => <InsightRow key={i.id} insight={i} />)
          ) : (
            <Text variant="subheadline" color="textMuted">
              {tooFewDataText()}
            </Text>
          )}
        </Card>
      </View>

      <Text variant="footnote" color="textMuted" align="center" style={styles.closing}>
        {t("reflection.closing")}
      </Text>
    </Screen>
  );
}

const useStyles = createThemedStyles((t) => ({
  weekRow: { flexDirection: "row", gap: 4 },
  day: { flex: 1, alignItems: "center", gap: 7 },
  dayShape: { height: 32, alignItems: "center", justifyContent: "center" },
  countText: { marginTop: 14 },

  wordsCard: { marginTop: 6 },
  wordsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  wordPill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surfaceSunken,
  },

  insightsCard: { marginTop: 6, gap: 12 },

  closing: { paddingHorizontal: 16, marginTop: 4 },
}));
