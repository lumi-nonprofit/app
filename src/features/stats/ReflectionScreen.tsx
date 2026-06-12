/* Ohlédnutí za týdnem — klidný souhrn reflektovaného týdne (v neděli ten
   právě končící, jinak naposledy dokončený): tečky dní, počet záznamů,
   nejčastější slova a max 2 nálezy. Žádné hodnocení, žádné srovnávání —
   jen co tu je, plus poděkování za všímavost. */
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Card, IconButton } from "../../ds/index";
import Screen from "../../components/Screen";
import { LumiHeader, SectionLabel } from "../../components/Header";
import MoodShape from "../../components/MoodShape";
import { useEntries } from "../../db/hooks";
import { computeInsights, TOO_FEW_DATA_TEXT } from "./insights";
import { reflectionWeekRange } from "./reflection";
import { InsightRow } from "./InsightsCard";
import {
  DAY_LETTERS,
  DAY_NAMES,
  INTENSITY_LABELS,
  MOOD_BY_ID,
  aggregateDay,
  czPlural,
  toISODate,
  type Entry,
  type ISODate,
} from "../../model";
import { colors, font, leading, palette, radius, type } from "../../theme";

/** 7 ISO dnů reflektovaného týdne od pondělí `from`; poledne kvůli změnám času. */
function weekDates(from: ISODate): ISODate[] {
  const monday = new Date(`${from}T12:00:00`);
  return DAY_LETTERS.map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toISODate(d);
  });
}

/** Nejčastější slova týdne (max 3), řazeno podle počtu výskytů. */
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

/* den jako tečka — stejné kódování jako v Přehledech: barva + tvar = stav,
   velikost = intenzita, prázdný den = obrysový kruh (nikdy jen barva) */
function ReflectionDay({ index, dayEntries }: ReflectionDayProps) {
  const agg = aggregateDay(dayEntries);
  const mood = agg ? MOOD_BY_ID[agg.mood] : null;
  /* `mood` existuje právě tehdy, když `agg` — podmínka rozšířena jen kvůli zúžení typů */
  const label =
    agg && mood
      ? `${DAY_NAMES[index]} — ${mood.name}, ${INTENSITY_LABELS[agg.intensity - 1]}`
      : `${DAY_NAMES[index]} — bez záznamu`;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      accessibilityHint="Souhrn dne: barva a tvar značí stav, velikost intenzitu."
      style={styles.day}
    >
      <View style={styles.dayShape}>
        {agg && mood ? (
          <MoodShape mood={mood} size={13 + agg.intensity * 3.4} />
        ) : (
          <MoodShape size={14} outline />
        )}
      </View>
      <Text style={styles.dayLabel}>{DAY_LETTERS[index]}</Text>
    </View>
  );
}

export default function ReflectionScreen() {
  const router = useRouter();
  /* okamžik otevření drží rozsah i titulek stabilní po celý život obrazovky */
  const [now] = React.useState(() => new Date());
  const range = reflectionWeekRange(now);
  const entries = useEntries(range);
  const days = weekDates(range.from);
  const count = entries.length;
  const words = React.useMemo(() => topWords(entries), [entries]);
  /* v reflexi max 2 nálezy — souhrn má zůstat krátký a klidný */
  const insights = computeInsights(entries, "Tenhle týden").slice(0, 2);

  return (
    <Screen>
      <View style={styles.topRow}>
        <IconButton
          icon="arrow-left"
          label="Zpět"
          accessibilityHint="Zavře ohlédnutí za týdnem."
          onPress={() => router.back()}
        />
      </View>

      {/* v neděli se ohlížíme za právě končícím týdnem — „minulý“ by mátl */}
      <LumiHeader
        kicker="Ohlédnutí"
        title={now.getDay() === 0 ? "Tvůj týden" : "Tvůj minulý týden"}
      />

      {/* tečky dní + počet záznamů */}
      <Card>
        <View style={styles.weekRow}>
          {days.map((iso, i) => (
            <ReflectionDay key={iso} index={i} dayEntries={entries.filter((e) => e.date === iso)} />
          ))}
        </View>
        <Text style={styles.countText}>
          {`Celkem ${count} ${czPlural(count, ["záznam", "záznamy", "záznamů"])}.`}
        </Text>
      </Card>

      {/* nejčastější slova — jen když nějaká jsou */}
      {words.length ? (
        <View>
          <SectionLabel>Nejčastější slova</SectionLabel>
          <Card style={styles.wordsCard}>
            <View style={styles.wordsRow}>
              {words.map((w) => (
                <View key={w} style={styles.wordPill}>
                  <Text style={styles.wordText}>{w}</Text>
                </View>
              ))}
            </View>
          </Card>
        </View>
      ) : null}

      {/* max 2 nálezy; pod prahem dat jemné povzbuzení */}
      <View>
        <SectionLabel>Co se ukazuje</SectionLabel>
        <Card style={styles.insightsCard}>
          {insights.length ? (
            insights.map((i) => <InsightRow key={i.id} insight={i} />)
          ) : (
            <Text style={styles.emptyText}>{TOO_FEW_DATA_TEXT}</Text>
          )}
        </Card>
      </View>

      <Text style={styles.closing}>Ať byl týden jakýkoliv, díky, že si ho všímáš.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: "row", alignItems: "center" },

  weekRow: { flexDirection: "row", gap: 4 },
  day: { flex: 1, alignItems: "center", gap: 7 },
  dayShape: { height: 32, alignItems: "center", justifyContent: "center" },
  dayLabel: { ...font.body(500), fontSize: type.xs, color: palette.ink700 },
  countText: {
    ...font.body(500),
    fontSize: type.sm,
    lineHeight: leading.body(type.sm),
    color: palette.ink700,
    marginTop: 14,
  },

  wordsCard: { marginTop: 6 },
  wordsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  wordPill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunken,
  },
  wordText: {
    ...font.body(500),
    fontSize: type.sm,
    lineHeight: leading.body(type.sm),
    color: colors.textBody,
  },

  insightsCard: { marginTop: 6, gap: 12 },
  emptyText: {
    ...font.body(400),
    fontSize: type.sm,
    lineHeight: leading.body(type.sm),
    color: palette.ink500,
  },

  closing: {
    ...font.body(400),
    fontSize: type.sm,
    lineHeight: leading.body(type.sm),
    color: palette.ink500,
    textAlign: "center",
    paddingHorizontal: 16,
    marginTop: 4,
  },
});
