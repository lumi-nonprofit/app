/* Pomoc — krizová intervence. Primární linka podle věku z onboardingu,
   druhá vždy viditelná hned pod ní; tlačítka volají přes tel: odkazy.
   Krizový register: konkrétně, čísla a akce napřed, žádný alarm. */
import React from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Badge, Button, Card, Icon, ListItem } from "../../ds/index";
import type { IconName } from "../../ds/Icon";
import Screen from "../../components/Screen";
import { LumiHeader, SectionLabel } from "../../components/Header";
import { palette, colors, radius, font, type, leading } from "../../theme";
import { HELP_LINES, type HelpLine } from "../../model";
import { useAppStore } from "../../store";
import { useDb, useDbVersion } from "../../db/provider";
import { PLAN_SECTIONS, planIsEmpty, readPlan, type PlanSectionId } from "./plan";
import { crisisCardHtml } from "./crisisCard";

const telHref = (phone: string): string => `tel:${phone.replace(/\s/g, "")}`;

/* ikona a tint pro sekce krizového plánu (id z plan.ts → vizuál) */
const PLAN_VISUALS: Record<
  PlanSectionId,
  { icon: IconName; iconTint?: string; iconColor?: string }
> = {
  signals: { icon: "eye" },
  helps: { icon: "heart", iconTint: colors.positiveSoft, iconColor: palette.sage700 },
  contacts: { icon: "users", iconTint: colors.infoSoft, iconColor: palette.lake700 },
};

interface LineRowProps {
  line: HelpLine;
  primary?: boolean;
}

function LineRow({ line, primary }: LineRowProps) {
  return (
    <View style={styles.lineRow}>
      <View>
        <View style={styles.lineHead}>
          <Text style={[styles.lineName, { fontSize: primary ? type.md : type.base }]}>
            {line.name}
          </Text>
          {primary ? <Badge tone="danger">tvoje linka</Badge> : null}
        </View>
        <Text style={styles.lineMeta}>{line.meta}</Text>
      </View>
      <Button
        variant={primary ? "crisis" : "secondary"}
        size={primary ? "md" : "sm"}
        href={telHref(line.phone)}
      >
        <Icon name="phone" size={17} color={primary ? colors.textOnAccent : colors.textStrong} />
        {`Zavolat ${line.phone}`}
      </Button>
    </View>
  );
}

export default function HelpScreen() {
  const { state } = useAppStore();
  const router = useRouter();
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
      <LumiHeader kicker="Pomoc" title="Jsme tu s tebou" />

      {/* krizová karta — primární linka podle věku z onboardingu */}
      <View style={styles.crisisCard}>
        <View style={styles.crisisHead}>
          <Icon name="heart-handshake" size={20} color={palette.clay700} />
          <Text style={styles.crisisTitle}>Potřebuješ si promluvit hned?</Text>
        </View>
        <LineRow line={primary} primary />
        <LineRow line={secondary} />
        <Text style={styles.crisisNote}>
          Při bezprostředním ohrožení života volej 155 nebo 112.
        </Text>
      </View>

      {/* krizový plán — tři sekce + tisk kartičky do peněženky */}
      <Card style={styles.planCard}>
        <View style={styles.planHead}>
          <Text style={styles.planTitle}>Můj krizový plán</Text>
          <Text style={styles.planSub}>Připrav si kroky, dokud je klid.</Text>
        </View>
        {PLAN_SECTIONS.map((s) => {
          const visual = PLAN_VISUALS[s.id];
          const filled = plan[s.id].trim().length > 0;
          return (
            <ListItem
              key={s.id}
              icon={visual.icon}
              iconTint={visual.iconTint}
              iconColor={visual.iconColor}
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
          iconTint={colors.accentSoft}
          iconColor={palette.sun700}
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
          iconTint={colors.infoSoft}
          iconColor={palette.lake700}
          title="Pomáháš někomu blízkému?"
          subtitle="Otevři režim pro chvíli, kdy držíš telefon za druhého"
          onPress={() => router.push("/handover")}
        />
      </Card>

      {/* rozcestník */}
      <View>
        <SectionLabel>Co dělat, když…</SectionLabel>
        <Card style={styles.sectionCard}>
          <ListItem
            icon="cloud"
            iconTint={colors.infoSoft}
            iconColor={palette.lake700}
            title="…přijde úzkost"
            subtitle="Krátké kroky pro tady a teď"
            onPress={() => {}}
          />
          <ListItem
            icon="waves"
            iconTint={colors.infoSoft}
            iconColor={palette.lake700}
            title="…přijde panika"
            subtitle="Co dělat během vlny"
            onPress={() => {}}
          />
          <ListItem
            icon="cloud-rain"
            iconTint={colors.infoSoft}
            iconColor={palette.lake700}
            title="…jsou myšlenky těžké"
            subtitle="Nejsi v tom — kde hledat oporu"
            onPress={() => {}}
          />
        </Card>
      </View>

      {/* kontakty */}
      <View>
        <SectionLabel>Kontakty</SectionLabel>
        <Card style={styles.sectionCard}>
          <ListItem
            icon="phone"
            iconTint={colors.dangerSoft}
            iconColor={palette.clay700}
            title="Linka bezpečí · 116 111"
            subtitle="nonstop, zdarma · děti a studenti do 26 let"
            href={telHref("116 111")}
          />
          <ListItem
            icon="phone"
            iconTint={colors.dangerSoft}
            iconColor={palette.clay700}
            title="Linka první psychické pomoci · 116 123"
            subtitle="nonstop, zdarma · dospělí"
            href={telHref("116 123")}
          />
          <ListItem
            icon="phone"
            iconTint={colors.dangerSoft}
            iconColor={palette.clay700}
            title="Rodičovská linka · 606 021 021"
            subtitle="Po–Pá 9–21 · rodiče a blízcí dětí"
            href={telHref("606 021 021")}
          />
          <ListItem
            icon="message-circle"
            iconTint={colors.positiveSoft}
            iconColor={palette.sage700}
            title="Chat Linky bezpečí"
            subtitle="denně 9–13 a 15–19 · když se nechce mluvit"
            onPress={() => {}}
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  /* karta jedné linky uvnitř krizové sekce */
  lineRow: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  lineHead: { flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" },
  lineName: { ...font.display(700), color: colors.textStrong },
  lineMeta: { ...font.body(400), fontSize: type.sm, color: palette.ink700, marginTop: 2 },

  crisisCard: { backgroundColor: colors.dangerSoft, borderRadius: radius.lg, padding: 16, gap: 10 },
  crisisHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 2,
    paddingHorizontal: 4,
  },
  crisisTitle: { ...font.display(700), fontSize: type.md, color: palette.clay700 },
  crisisNote: {
    paddingTop: 2,
    paddingHorizontal: 4,
    paddingBottom: 4,
    ...font.body(600),
    fontSize: type.sm,
    color: palette.clay700,
    lineHeight: leading.body(type.sm),
  },

  planCard: { paddingTop: 16, paddingHorizontal: 12, paddingBottom: 8 },
  planHead: { paddingHorizontal: 8, paddingBottom: 6 },
  planTitle: { ...font.display(700), fontSize: type.md, color: colors.textStrong },
  planSub: { ...font.body(400), fontSize: type.sm, color: palette.ink700, marginTop: 2 },

  slimCard: { paddingVertical: 8, paddingHorizontal: 12 },
  sectionCard: { paddingVertical: 8, paddingHorizontal: 12, marginTop: 6 },
});
