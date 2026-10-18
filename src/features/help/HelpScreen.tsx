/* Pomoc — krizová intervence. Primární linka podle věku z onboardingu,
   druhá vždy viditelná hned pod ní; tlačítka volají přes tel: odkazy.
   Krizový register: konkrétně, čísla a akce napřed, žádný alarm. */
import React from "react";
import { Alert, View } from "react-native";
import { useRouter } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Badge, Button, Card, Icon, ListItem, Text } from "../../ds";
import type { IconName } from "../../ds/Icon";
import type { Tone } from "../../ds";
import Screen from "../../components/Screen";
import { LumiHeader, SectionLabel } from "../../components/Header";
import { createThemedStyles, useTheme } from "../../theme";
import { HELP_LINES, type HelpLine } from "../../model";
import { useAppStore } from "../../store";
import { useDb, useDbVersion } from "../../db/provider";
import { PLAN_SECTIONS, planIsEmpty, readPlan, type PlanSectionId } from "./plan";
import { crisisCardHtml } from "./crisisCard";
import { CHAT_LINES, GUIDES } from "./guides";
import { CONTACT_LINES, EMERGENCY_LINES, telHref } from "./lines";

/* ikona a tón pro sekce krizového plánu (id z plan.ts → vizuál) */
const PLAN_VISUALS: Record<PlanSectionId, { icon: IconName; tone?: Tone }> = {
  signals: { icon: "eye" },
  helps: { icon: "heart", tone: "positive" },
  contacts: { icon: "users", tone: "info" },
};

interface LineRowProps {
  line: HelpLine;
  primary?: boolean;
}

function LineRow({ line, primary }: LineRowProps) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.lineRow}>
      <View>
        <View style={styles.lineHead}>
          <Text variant={primary ? "title3" : "headline"}>{line.name}</Text>
          {primary ? <Badge tone="danger">tvoje linka</Badge> : null}
        </View>
        <Text variant="footnote" color="textMuted" style={styles.lineMeta}>
          {line.meta}
        </Text>
      </View>
      <Button
        variant={primary ? "crisis" : "secondary"}
        size={primary ? "md" : "sm"}
        href={telHref(line.phone)}
      >
        <Icon
          name="phone"
          size={17}
          color={primary ? theme.colors.textOnCrisis : theme.colors.textStrong}
        />
        {`Zavolat ${line.phone}`}
      </Button>
    </View>
  );
}

export default function HelpScreen() {
  const { state } = useAppStore();
  const router = useRouter();
  const theme = useTheme();
  const styles = useStyles();
  const db = useDb();
  const { version } = useDbVersion();
  const age = state.age;
  const primary = age === "plus27" ? HELP_LINES.plus27 : HELP_LINES.u26;
  const secondary = age === "plus27" ? HELP_LINES.u26 : HELP_LINES.plus27;

  /* plán se přečte znovu po každém zápisu (návrat z editoru zvýší verzi) */
  const plan = React.useMemo(() => {
    void version;
    return readPlan(db);
  }, [db, version]);

  const printCard = async () => {
    if (planIsEmpty(plan)) {
      Alert.alert(
        "Nejdřív si plán vyplň",
        "Kartička se skládá z tvého krizového plánu — vyplň aspoň jednu část.",
      );
      return;
    }
    try {
      const { uri } = await Print.printToFileAsync({ html: crisisCardHtml(plan) });
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Krizová kartička",
      });
    } catch {
      Alert.alert("Nepovedlo se", "Kartičku se teď nepodařilo vytvořit. Zkus to prosím znovu.");
    }
  };
  return (
    <Screen>
      {/* titulek obrazovky „Pomoc“ nese hlavička; lead bez „my“ (HIG Writing) */}
      <LumiHeader title="Pomoc je blízko" />

      {/* krizová karta — primární linka podle věku z onboardingu */}
      <View style={styles.crisisCard}>
        <View style={styles.crisisHead}>
          <Icon name="heart-handshake" size={20} color={theme.colors.textDanger} />
          <Text
            accessibilityRole="header"
            variant="headline"
            color="textDanger"
            style={styles.flex1}
          >
            Potřebuješ si promluvit hned?
          </Text>
        </View>
        <LineRow line={primary} primary />
        <LineRow line={secondary} />
        {/* tísňová čísla jako volatelné řádky (ne jen text) */}
        <View style={styles.emergencyRows}>
          {EMERGENCY_LINES.map((line) => (
            <ListItem
              key={line.id}
              icon={line.icon}
              tone={line.tone}
              title={line.name}
              subtitle={line.meta}
              href={telHref(line.phone)}
              accessibilityLabel={`Zavolat ${line.phone} · ${line.name}`}
            />
          ))}
        </View>
      </View>

      {/* krizový plán — tři sekce + tisk kartičky do peněženky */}
      <Card style={styles.planCard}>
        <View style={styles.planHead}>
          <Text accessibilityRole="header" variant="headline">
            Můj krizový plán
          </Text>
          <Text variant="footnote" color="textMuted" style={styles.planSub}>
            Připrav si kroky, dokud je klid.
          </Text>
        </View>
        {PLAN_SECTIONS.map((s) => {
          const visual = PLAN_VISUALS[s.id];
          const filled = plan[s.id].trim().length > 0;
          return (
            <ListItem
              key={s.id}
              icon={visual.icon}
              tone={visual.tone}
              title={s.title}
              subtitle={filled ? `${s.subtitle} · vyplněno` : s.subtitle}
              onPress={() =>
                router.push({ pathname: "/plan/[section]", params: { section: s.id } })
              }
            />
          );
        })}
        <ListItem
          icon="printer"
          title="Vytisknout kartičku do peněženky"
          subtitle="PDF na přeložení a zalaminování"
          onPress={printCard}
        />
      </Card>

      {/* rychlé zklidnění */}
      <Card style={styles.slimCard}>
        <ListItem
          icon="wind"
          title="Rychlé zklidnění"
          subtitle="Dech a uzemnění na 2 minuty"
          trailing={<Badge tone="accent">2 min</Badge>}
          onPress={() => router.push("/calm")}
        />
      </Card>

      {/* režim pro třetí osobu — celoobrazovkový, bez osobních dat */}
      <Card style={styles.slimCard}>
        <ListItem
          icon="heart-handshake"
          tone="info"
          title="Pomáháš někomu blízkému?"
          subtitle="Otevři režim pro chvíli, kdy držíš telefon za druhého"
          onPress={() => router.push("/handover")}
        />
      </Card>

      {/* rozcestník — jen když má obsah (žádné mrtvé řádky) */}
      {GUIDES.length ? (
        <View>
          <SectionLabel>Co dělat, když…</SectionLabel>
          <Card style={styles.sectionCard}>
            {GUIDES.map((g) => (
              <ListItem
                key={g.id}
                icon={g.icon}
                tone="info"
                title={g.title}
                subtitle={g.subtitle}
                onPress={() => {}}
              />
            ))}
          </Card>
        </View>
      ) : null}

      {/* kontakty — jeden zdroj v lines.ts */}
      <View>
        <SectionLabel>Kontakty</SectionLabel>
        <Card style={styles.sectionCard}>
          {CONTACT_LINES.map((line) => (
            <ListItem
              key={line.id}
              icon={line.icon}
              tone={line.tone}
              title={`${line.name} · ${line.phone}`}
              subtitle={line.meta}
              href={telHref(line.phone)}
            />
          ))}
          {CHAT_LINES.map((chat) => (
            <ListItem
              key={chat.url}
              icon="message-circle"
              tone="positive"
              title={chat.name}
              subtitle={chat.meta}
              href={chat.url}
            />
          ))}
        </Card>
      </View>
    </Screen>
  );
}

const useStyles = createThemedStyles((t) => ({
  flex1: { flex: 1 },
  /* karta jedné linky uvnitř krizové sekce */
  lineRow: {
    backgroundColor: t.colors.surfaceCard,
    borderRadius: t.radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
    ...t.cardBorder,
  },
  lineHead: { flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" },
  lineMeta: { marginTop: 2 },

  crisisCard: {
    backgroundColor: t.colors.dangerSoft,
    borderRadius: t.radius.lg,
    padding: 16,
    gap: 10,
  },
  crisisHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 2,
    paddingHorizontal: 4,
  },
  emergencyRows: { paddingTop: 2 },

  planCard: { paddingTop: 16, paddingHorizontal: 12, paddingBottom: 8 },
  planHead: { paddingHorizontal: 8, paddingBottom: 6 },
  planSub: { marginTop: 2 },

  slimCard: { paddingVertical: 8, paddingHorizontal: 12 },
  sectionCard: { paddingVertical: 8, paddingHorizontal: 12, marginTop: 6 },
}));
