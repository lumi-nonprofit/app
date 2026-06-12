/* Přehledy — týden jako tečky (barva + tvar = stav, velikost = intenzita,
   prázdný den = obrysový kruh), wellbeing index, data pro výzkum.
   Varianty jsou datové: prázdný týden = 0–1 záznam, empatická varianta
   při WHO-5 pod 50 % — žádné alarmy, žádná vina. */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Badge, Button, Card, Icon, ListItem, ProgressRing, Switch } from "../../ds/index";
import Screen from "../../components/Screen";
import { LumiHeader, SectionLabel } from "../../components/Header";
import MoodShape from "../../components/MoodShape";
import { palette, colors, radius, font, leading, shadow, type } from "../../theme";
import {
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
import { useAppStore } from "../../store";
import { useEntries, useMeasurements } from "../../db/hooks";
import type { Measurement } from "../../db/repo";
import { gad7Band, phq9Band, trendText, type Band } from "../measure/scoring";
import BackupCard from "./BackupCard";

type Period = "týden" | "měsíc";

interface DayDotProps {
  day: WeekDay;
}

/* den jako tečka: barva + tvar = stav, velikost = intenzita, prázdný = obrysový kruh */
function DayDot({ day }: DayDotProps) {
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
      <Text style={[styles.dayDotLabel, day.today ? styles.dayDotLabelToday : null]}>
        {day.today ? "dnes" : day.label}
      </Text>
    </View>
  );
}

function MoodLegend() {
  return (
    <View style={styles.legend}>
      {MOODS.map((m) => (
        <View key={m.id} style={styles.legendItem}>
          <MoodShape mood={m} size={11} />
          <Text style={styles.legendText}>{m.name.toLowerCase()}</Text>
        </View>
      ))}
      <View style={styles.legendItem}>
        <MoodShape size={11} outline />
        <Text style={styles.legendText}>bez záznamu</Text>
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

export default function StatsScreen() {
  const { state, patch } = useAppStore();
  const router = useRouter();
  /* měsíční pohled jde 4 kalendářní týdny zpět — 35 dní rozsah bohatě stačí */
  const monthStart = new Date();
  monthStart.setDate(monthStart.getDate() - 35);
  const entries = useEntries({ from: toISODate(monthStart) });
  const who5 = useMeasurements("who5");
  const share = state.share;

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
      <LumiHeader
        kicker="Přehledy"
        title="Tvůj týden"
        trailing={
          <View
            style={styles.seg}
            accessibilityRole="tablist"
            accessibilityLabel="Období"
            accessibilityHint="Přepíná zobrazení mezi týdnem a měsícem."
          >
            {(["týden", "měsíc"] satisfies Period[]).map((p) => (
              <Pressable
                key={p}
                accessibilityRole="tab"
                accessibilityState={{ selected: period === p }}
                /* vizuálně 32 pt, hitSlop dorovnává dotykový cíl na ≥ 44 pt */
                hitSlop={{ top: 6, bottom: 6 }}
                style={[styles.segBtn, period === p ? styles.segBtnOn : null]}
                onPress={() => setPeriod(p)}
              >
                <Text style={[styles.segBtnText, period === p ? styles.segBtnTextOn : null]}>
                  {p}
                </Text>
              </Pressable>
            ))}
          </View>
        }
      />

      {/* kalendář nálad */}
      <Card>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>Nálada podle dní</Text>
          <Badge>{period === "týden" ? "tento týden" : "posledních 28 dní"}</Badge>
        </View>

        {empty ? (
          <View>
            <View style={styles.weekRow}>
              {week.map((d) => (
                <DayDot key={d.label} day={d} />
              ))}
            </View>
            <Text style={styles.emptyText}>Zatím tu toho moc není — každý zápis se počítá.</Text>
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
                {row.map((d) => {
                  const m = d.entry ? MOOD_BY_ID[d.entry.mood] : null;
                  return (
                    <View key={d.iso} style={[styles.monthCell, { opacity: d.future ? 0.45 : 1 }]}>
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

      {/* wellbeing index */}
      <Card>
        <View style={styles.wellRow}>
          <ProgressRing
            value={measurement ? measurement.score / 100 : 0}
            size={84}
            color={low ? palette.lake500 : palette.sun500}
            label={measurement ? `${measurement.score} %` : "—"}
            sublabel="WHO-5"
          />
          <View style={styles.wellBody}>
            <Text style={styles.wellTitle}>Wellbeing index</Text>
            {!measurement ? (
              <View>
                <Text style={[styles.wellText, styles.wellTextSpaced]}>
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
                <Text style={styles.wellTextLow}>
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
                <Text style={[styles.wellText, who5Due ? styles.wellTextSpaced : null]}>
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
            iconTint={colors.infoSoft}
            iconColor={palette.lake700}
            title="Nálada do hloubky"
            subtitle={deepSubtitle(phq9, 9, phq9Band)}
            onPress={() => router.push("/measure/phq9")}
          />
          <ListItem
            icon="waves"
            iconTint={colors.infoSoft}
            iconColor={palette.lake700}
            title="Napětí a obavy do hloubky"
            subtitle={deepSubtitle(gad7, 7, gad7Band)}
            onPress={() => router.push("/measure/gad7")}
          />
        </Card>
        <Text style={styles.deepNote}>
          Dobrovolné — jen když chceš. Lumi ti je nikdy nebude připomínat.
        </Text>
      </View>

      {/* data pro výzkum — toggle, výchozí stav vypnuto, žádné dark patterns */}
      <Card variant="sunken">
        <View style={styles.shareRow}>
          <Icon name="shield" size={20} color={palette.lake700} style={styles.shareIcon} />
          <View style={styles.shareBody}>
            <Text style={styles.shareTitle}>Data pro výzkum</Text>
            <Text style={styles.shareText}>
              Tvoje záznamy zůstávají v telefonu. Pro výzkum je sdílíme jen anonymně a jen pokud to
              dovolíš.
            </Text>
            <Switch
              checked={share}
              onChange={(v) => patch({ share: v })}
              label={share ? "Sdílení zapnuto" : "Sdílení vypnuto"}
            />
          </View>
        </View>
      </Card>

      {/* záloha — export/import záznamů */}
      <BackupCard />
    </Screen>
  );
}

const styles = StyleSheet.create({
  selfStart: { alignSelf: "flex-start" },
  dayDot: { flex: 1, alignItems: "center", gap: 7 },
  dayDotShape: { height: 32, alignItems: "center", justifyContent: "center" },
  dayDotLabel: { ...font.body(500), fontSize: type.xs, color: palette.ink700 },
  dayDotLabelToday: { ...font.body(700), color: palette.sun700 },

  /* segmentový přepínač období (.lumi-seg z app.css) */
  seg: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.pill,
    padding: 3,
    gap: 2,
  },
  segBtn: {
    paddingVertical: 6,
    paddingHorizontal: 13,
    minHeight: 32,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  segBtnOn: { backgroundColor: colors.surfaceCard, ...shadow.card },
  segBtnText: { ...font.body(600), fontSize: type.sm, color: palette.ink700 },
  segBtnTextOn: { color: colors.textStrong },

  cardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 12,
  },
  cardTitle: { ...font.body(600), color: colors.textStrong, fontSize: type.base },

  weekRow: { flexDirection: "row", gap: 4 },
  monthGrid: { gap: 10 },
  monthCell: { flex: 1, flexDirection: "row", justifyContent: "center" },

  emptyText: {
    ...font.body(400),
    fontSize: type.base,
    color: colors.textBody,
    lineHeight: leading.body(type.base),
    marginTop: 16,
    marginBottom: 12,
  },

  legend: { flexDirection: "row", gap: 12, flexWrap: "wrap", marginTop: 14 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendText: { ...font.body(400), fontSize: type.xs, color: palette.ink700 },

  wellRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  wellBody: { flex: 1 },
  wellTitle: { ...font.body(600), color: colors.textStrong, fontSize: type.base },
  wellText: {
    ...font.body(400),
    fontSize: type.sm,
    color: palette.ink700,
    lineHeight: leading.body(type.sm),
    marginTop: 2,
  },
  wellTextSpaced: { marginBottom: 10 },
  lowActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignSelf: "flex-start" },
  deepCard: { paddingVertical: 8, paddingHorizontal: 12, marginTop: 6 },
  deepNote: {
    ...font.body(400),
    fontSize: type.xs,
    lineHeight: leading.body(type.xs),
    color: palette.ink500,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  wellTextLow: {
    ...font.body(400),
    fontSize: type.sm,
    color: palette.ink700,
    lineHeight: leading.body(type.sm),
    marginTop: 2,
    marginBottom: 10,
  },

  shareRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  shareIcon: { marginTop: 2 },
  shareBody: { flex: 1 },
  shareTitle: { ...font.body(600), fontSize: type.base, color: colors.textStrong, marginBottom: 2 },
  shareText: {
    ...font.body(400),
    fontSize: type.sm,
    color: palette.ink700,
    lineHeight: leading.body(type.sm),
    marginBottom: 12,
  },
});
