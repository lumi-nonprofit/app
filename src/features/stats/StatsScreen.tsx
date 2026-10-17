/* Přehledy — týden jako tečky (barva + tvar = stav, velikost = intenzita,
   prázdný den = obrysový kruh), vzorce, wellbeing index, hlubší screeningy.
   Nastavení (sdílení, připomínky, záloha) má vlastní obrazovku.
   Varianty jsou datové: prázdný týden = 0–1 záznam, empatická varianta
   při WHO-5 pod 50 % — žádné alarmy, žádná vina. */
import React from "react";
import { View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Badge, Button, Card, ListItem, ProgressRing, SegmentedControl, Text } from "../../ds";
import Screen from "../../components/Screen";
import { LumiHeader, SectionLabel } from "../../components/Header";
import { headerItems } from "../../components/HeaderItems";
import MoodShape from "../../components/MoodShape";
import { createThemedStyles, useTheme } from "../../theme";
import {
  DAY_NAMES,
  INTENSITY_LABELS,
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
import { gad7Band, phq9Band, trendText, type Band } from "../measure/scoring";
import InsightsCard from "./InsightsCard";
import { isReflectionWindowOpen } from "./reflection";

type Period = "týden" | "měsíc";
const PERIODS: { value: Period; label: string }[] = [
  { value: "týden", label: "týden" },
  { value: "měsíc", label: "měsíc" },
];

interface DayDotProps {
  day: WeekDay;
}

/* den jako tečka: barva + tvar = stav, velikost = intenzita, prázdný = obrysový kruh */
function DayDot({ day }: DayDotProps) {
  const styles = useStyles();
  const mood = day.entry ? MOOD_BY_ID[day.entry.mood] : null;
  const size = day.entry ? 13 + day.entry.intensity * 3.4 : 14;
  /* `mood` existuje právě tehdy, když `day.entry` — podmínka rozšířena jen kvůli zúžení typů */
  const label =
    day.entry && mood
      ? `${day.dayName} — ${mood.name}, ${INTENSITY_LABELS[day.entry.intensity - 1]}`
      : `${day.dayName} — bez záznamu`;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      accessibilityHint="Souhrn dne: barva a tvar značí stav, velikost intenzitu."
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
        {day.today ? "dnes" : day.label}
      </Text>
    </View>
  );
}

function MoodLegend() {
  const styles = useStyles();
  return (
    <View style={styles.legend}>
      {MOODS.map((m) => (
        <View key={m.id} style={styles.legendItem}>
          <MoodShape mood={m} size={11} />
          <Text variant="caption1" weight="regular">
            {m.name.toLowerCase()}
          </Text>
        </View>
      ))}
      <View style={styles.legendItem}>
        <MoodShape size={11} outline />
        <Text variant="caption1" weight="regular">
          bez záznamu
        </Text>
      </View>
    </View>
  );
}

/** Podtitulek karty hlubšího screeningu: poslední pásmo + trend, nikdy diagnóza. */
function deepSubtitle(
  list: Measurement[],
  questionCount: number,
  band: (s: number) => Band,
): string {
  if (!list.length) return `Krátký dotazník (${questionCount} otázek) · dobrovolný`;
  const last = list[list.length - 1];
  const prev = list.length > 1 ? list[list.length - 2].score : null;
  const trend = trendText(last.score, prev);
  const suffix = trend ? ` · ${trend.charAt(0).toLowerCase()}${trend.slice(1)}` : "";
  return `Naposledy: ${band(last.score).label}${suffix}`;
}

/** Popisek buňky měsíční mřížky: „pondělí 6. 10. — Napětí, silně“ / „bez záznamu“. */
function monthCellLabel(
  dayIndex: number,
  iso: string,
  entry: { mood: keyof typeof MOOD_BY_ID; intensity: number } | null,
): string {
  const [, m, d] = iso.split("-");
  const date = `${DAY_NAMES[dayIndex]} ${Number(d)}. ${Number(m)}.`;
  return entry
    ? `${date} — ${MOOD_BY_ID[entry.mood].name}, ${INTENSITY_LABELS[entry.intensity - 1]}`
    : `${date} — bez záznamu`;
}

export default function StatsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useStyles();
  /* měsíční pohled jde 4 kalendářní týdny zpět — 35 dní rozsah bohatě stačí */
  const monthStart = new Date();
  monthStart.setDate(monthStart.getDate() - 35);
  const entries = useEntries({ from: toISODate(monthStart) });
  const who5 = useMeasurements("who5");

  const phq9 = useMeasurements("phq9");
  const gad7 = useMeasurements("gad7");

  const [period, setPeriod] = React.useState<Period>("týden");
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
              label: "Nastavení",
              icon: "gear",
              sf: "gearshape",
              onPress: () => router.push("/settings"),
            },
          ],
        })}
      />
      <LumiHeader
        title="Tvůj týden"
        trailing={
          <SegmentedControl
            options={PERIODS}
            value={period}
            onChange={setPeriod}
            accessibilityLabel="Období"
            accessibilityHint="Přepíná zobrazení mezi týdnem a měsícem."
          />
        }
      />

      {/* kalendář nálad */}
      <Card>
        <View style={styles.cardHead}>
          <Text variant="headline">Nálada podle dní</Text>
          <Badge>{period === "týden" ? "tento týden" : "posledních 28 dní"}</Badge>
        </View>

        {empty ? (
          <View>
            <View style={styles.weekRow}>
              {week.map((d) => (
                <DayDot key={d.label} day={d} />
              ))}
            </View>
            <Text variant="body" style={styles.emptyText}>
              Zatím tu toho moc není — každý zápis se počítá.
            </Text>
            <Button
              variant="secondary"
              size="sm"
              onPress={() => router.push("/checkin")}
              style={styles.selfStart}
            >
              Začít check-in
            </Button>
          </View>
        ) : period === "týden" ? (
          <View style={styles.weekRow}>
            {week.map((d) => (
              <DayDot key={d.label} day={d} />
            ))}
          </View>
        ) : (
          <View style={styles.monthGrid}>
            {buildMonth(entries).map((row, w) => (
              <View key={w} style={styles.weekRow}>
                {row.map((d, i) => {
                  const m = d.entry ? MOOD_BY_ID[d.entry.mood] : null;
                  return (
                    <View
                      key={d.iso}
                      accessible
                      accessibilityRole="image"
                      accessibilityLabel={monthCellLabel(i, d.iso, d.entry)}
                      style={[styles.monthCell, { opacity: d.future ? 0.45 : 1 }]}
                    >
                      {/* `m` existuje právě tehdy, když `d.entry` — podmínka rozšířena jen kvůli zúžení typů */}
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

      {/* lokální vzorce ze záznamů zvoleného období */}
      <InsightsCard entries={entries} period={period} />

      {/* týdenní reflexe — karta jen v okně neděle 17:00 → konec pondělí */}
      {isReflectionWindowOpen(new Date()) ? (
        <Card style={styles.deepCard}>
          <ListItem
            icon="sparkles"
            title="Ohlédnutí za týdnem"
            subtitle="Souhrn: tečky, slova a co se ukazuje"
            onPress={() => router.push("/reflection")}
          />
        </Card>
      ) : null}

      {/* wellbeing index */}
      <Card>
        <View style={styles.wellRow}>
          <ProgressRing
            value={measurement ? measurement.score / 100 : 0}
            size={84}
            color={low ? theme.colors.textInfo : undefined}
            label={measurement ? `${measurement.score} %` : "—"}
            sublabel="WHO-5"
          />
          <View style={styles.wellBody}>
            <Text variant="headline">Wellbeing index</Text>
            {!measurement ? (
              <View>
                <Text variant="subheadline" color="textMuted" style={styles.wellTextSpaced}>
                  Krátký dotazník (5 otázek) ti nastaví výchozí bod. Bez známek, bez porovnávání.
                </Text>
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() => router.push("/measure/who5")}
                  style={styles.selfStart}
                >
                  Vyplnit první dotazník
                </Button>
              </View>
            ) : low ? (
              <View>
                <Text variant="subheadline" color="textMuted" style={styles.wellTextSpaced}>
                  Poslední dva týdny vypadají náročně. Je v pořádku říct si o podporu.
                </Text>
                <View style={styles.lowActions}>
                  <Button variant="secondary" size="sm" onPress={() => router.push("/help")}>
                    Otevřít Pomoc
                  </Button>
                  {who5Due ? (
                    <Button variant="ghost" size="sm" onPress={() => router.push("/measure/who5")}>
                      Vyplnit dotazník
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
                    Vyplnit dotazník
                  </Button>
                ) : null}
              </View>
            )}
          </View>
        </View>
      </Card>

      {/* hlubší screeningy — dobrovolné, nikdy nevnucované, žádné notifikace */}
      <View>
        <SectionLabel>Chceš jít víc do hloubky?</SectionLabel>
        <Card style={styles.deepCard}>
          <ListItem
            icon="cloud"
            tone="info"
            title="Nálada do hloubky"
            subtitle={deepSubtitle(phq9, 9, phq9Band)}
            onPress={() => router.push("/measure/phq9")}
          />
          <ListItem
            icon="waves"
            tone="info"
            title="Napětí a obavy do hloubky"
            subtitle={deepSubtitle(gad7, 7, gad7Band)}
            onPress={() => router.push("/measure/gad7")}
          />
        </Card>
        <Text variant="footnote" color="textMuted" style={styles.deepNote}>
          Dobrovolné — jen když chceš. Lumi ti je nikdy nebude připomínat.
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
