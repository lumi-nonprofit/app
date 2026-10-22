/* "What shows up": local patterns from the entries of the chosen period. The texts come ready
   from insights.ts (always descriptive, never causal); the card only draws them. The text
   carries the information, the icon is decoration. Below the data threshold the card shows a
   gentle encouragement instead of patterns: no guilt. */
import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Card, Icon, Text } from "../../ds";
import type { IconName } from "../../ds/Icon";
import { SectionLabel } from "../../components/Header";
import { useTranslation } from "../../i18n";
import { computeInsights, tooFewDataText, type Insight, type Period } from "./insights";
import { buildWeek, type Entry } from "../../model";
import { createThemedStyles, useTheme } from "../../theme";

/* The icon of each kind of insight; insights.ts gives the id, an unknown id gets sparkles. */
const INSIGHT_ICONS: Record<string, IconName> = {
  frequent: "sparkles",
  "tag-mood": "eye",
  daypart: "clock",
};

/** One insight row. The weekly reflection (ReflectionScreen) shares it. */
export function InsightRow({ insight }: { insight: Insight }) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Icon
          name={INSIGHT_ICONS[insight.id] ?? "sparkles"}
          size={16}
          color={theme.colors.textAccent}
        />
      </View>
      <Text variant="subheadline" style={styles.rowText}>
        {insight.text}
      </Text>
    </View>
  );
}

interface Props {
  entries: Entry[];
  period: Period;
}

export default function InsightsCard({ entries, period }: Props) {
  const router = useRouter();
  const styles = useStyles();
  const { t } = useTranslation("stats");
  /* A week is the 7 ISO days of the current week (Monday to Sunday); a month is the whole
     period that the caller passes (the overview reads about 35 days back). */
  const scoped = React.useMemo(() => {
    if (period === "month") return entries;
    const days = new Set(buildWeek(entries).map((d) => d.iso));
    return entries.filter((e) => days.has(e.date));
  }, [entries, period]);
  const insights = computeInsights(scoped, period);

  return (
    <View>
      <SectionLabel>{t("insights.title")}</SectionLabel>
      <Card style={styles.card}>
        {insights.length ? (
          insights.map((i) => <InsightRow key={i.id} insight={i} />)
        ) : (
          <View style={styles.empty}>
            <Text variant="subheadline" color="textMuted">
              {tooFewDataText()}
            </Text>
            {/* An empty state with a clear next step (HIG guidance on copy). */}
            <Button variant="ghost" size="sm" onPress={() => router.push("/checkin")}>
              {t("insights.addEntry")}
            </Button>
          </View>
        )}
      </Card>
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  card: { marginTop: 6, gap: 12 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  rowIcon: {
    width: 28,
    height: 28,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  rowText: { flex: 1, alignSelf: "center" },
  empty: { gap: 8, alignItems: "flex-start" },
}));
