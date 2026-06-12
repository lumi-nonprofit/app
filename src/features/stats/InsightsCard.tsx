/* Co se ukazuje — lokální vzorce ze záznamů zvoleného období.
   Texty přicházejí hotové z insights.ts (vždy deskriptivní, nikdy kauzální),
   karta je jen vykresluje; informaci nese text, ikona je dekorace.
   Pod prahem dat jemné povzbuzení místo vzorců — žádná vina. */
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card, Icon } from "../../ds/index";
import type { IconName } from "../../ds/Icon";
import { SectionLabel } from "../../components/Header";
import { computeInsights, TOO_FEW_DATA_TEXT, type Insight } from "./insights";
import { buildWeek, type Entry } from "../../model";
import { colors, font, leading, palette, radius, type } from "../../theme";

type Period = "týden" | "měsíc";

/* ikona podle druhu nálezu — id dodává insights.ts; neznámé id → sparkles */
const INSIGHT_ICONS: Record<string, IconName> = {
  frequent: "sparkles",
  "tag-mood": "eye",
  daypart: "clock",
};

/** Jeden řádek nálezu — sdílí ho i Ohlédnutí za týdnem (ReflectionScreen). */
export function InsightRow({ insight }: { insight: Insight }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Icon name={INSIGHT_ICONS[insight.id] ?? "sparkles"} size={16} color={palette.sun700} />
      </View>
      <Text style={styles.rowText}>{insight.text}</Text>
    </View>
  );
}

interface Props {
  entries: Entry[];
  period: Period;
}

export default function InsightsCard({ entries, period }: Props) {
  /* týden = 7 ISO dnů aktuálního týdne (Po–Ne); měsíc = celé předané období
     (Přehledy už čtou jen ~35 dní zpět) */
  const scoped = React.useMemo(() => {
    if (period === "měsíc") return entries;
    const days = new Set(buildWeek(entries).map((d) => d.iso));
    return entries.filter((e) => days.has(e.date));
  }, [entries, period]);
  const insights = computeInsights(scoped, period === "týden" ? "Tenhle týden" : "Tenhle měsíc");

  return (
    <View>
      <SectionLabel>Co se ukazuje</SectionLabel>
      <Card style={styles.card}>
        {insights.length ? (
          insights.map((i) => <InsightRow key={i.id} insight={i} />)
        ) : (
          <Text style={styles.empty}>{TOO_FEW_DATA_TEXT}</Text>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 6, gap: 12 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  rowIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  rowText: {
    flex: 1,
    ...font.body(400),
    fontSize: type.sm,
    lineHeight: leading.body(type.sm),
    color: palette.ink700,
    alignSelf: "center",
  },
  empty: {
    ...font.body(400),
    fontSize: type.sm,
    lineHeight: leading.body(type.sm),
    color: palette.ink500,
  },
});
