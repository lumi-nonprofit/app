/* Help: crisis intervention. The primary line follows the age band from the onboarding, the
   second line is always visible under it, and the buttons call through "tel:" links. The crisis
   register is concrete: numbers and actions first, no alarm. The texts come from the `help`
   catalog; the lines and the plan sections come from lines.ts and plan.ts. */
import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Badge, Button, Card, Icon, ListItem, Text } from "../../ds";
import type { IconName } from "../../ds/Icon";
import type { Tone } from "../../ds";
import Screen from "../../components/Screen";
import { LumiHeader, SectionLabel } from "../../components/Header";
import { useTranslation } from "../../i18n";
import { notify } from "../../lib/dialogs";
import { createThemedStyles, useTheme } from "../../theme";
import { HELP_LINES, type HelpLine } from "../../model";
import { useAppStore } from "../../store";
import { useDb, useDbVersion } from "../../db/provider";
import { PLAN_SECTIONS, planIsEmpty, readPlan, type PlanSectionId } from "./plan";
import { crisisCardHtml } from "./crisisCard";
import { CHAT_LINES, GUIDES } from "./guides";
import { CONTACT_LINES, EMERGENCY_LINES, telHref } from "./lines";

/* The icon and the tone of each crisis plan section (the id from plan.ts gives the visual). */
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
  const { t } = useTranslation(["help", "common"]);
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.lineRow}>
      <View>
        <View style={styles.lineHead}>
          <Text variant={primary ? "title3" : "headline"}>{line.name}</Text>
          {primary ? <Badge tone="danger">{t("lines.yourLine")}</Badge> : null}
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
        {t("lines.call", { phone: line.phone })}
      </Button>
    </View>
  );
}

export default function HelpScreen() {
  const { t } = useTranslation(["help", "common"]);
  const { state } = useAppStore();
  const router = useRouter();
  const theme = useTheme();
  const styles = useStyles();
  const db = useDb();
  const { version } = useDbVersion();
  const age = state.age;
  const primary = age === "plus27" ? HELP_LINES.plus27 : HELP_LINES.u26;
  const secondary = age === "plus27" ? HELP_LINES.u26 : HELP_LINES.plus27;

  /* The screen reads the plan again after each write (the return from the editor raises the version). */
  const plan = React.useMemo(() => {
    void version;
    return readPlan(db);
  }, [db, version]);

  const printCard = async () => {
    if (planIsEmpty(plan)) {
      void notify({ title: t("plan.print.emptyTitle"), message: t("plan.print.emptyMessage") });
      return;
    }
    try {
      const { uri } = await Print.printToFileAsync({ html: crisisCardHtml(plan) });
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: t("plan.print.shareTitle"),
      });
    } catch {
      void notify({ title: t("plan.print.failedTitle"), message: t("plan.print.failedMessage") });
    }
  };
  return (
    <Screen>
      {/* The native header carries the title of the tab; the lead has no "we" (HIG: the guidance on text). */}
      <LumiHeader title={t("screen.title")} />

      {/* The crisis card: the primary line follows the age band from the onboarding. */}
      <View style={styles.crisisCard}>
        <View style={styles.crisisHead}>
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
        <LineRow line={primary} primary />
        <LineRow line={secondary} />
        {/* The emergency numbers are callable rows, not only text. */}
        <View style={styles.emergencyRows}>
          {EMERGENCY_LINES.map((line) => (
            <ListItem
              key={line.id}
              icon={line.icon}
              tone={line.tone}
              title={line.name}
              subtitle={line.meta}
              href={telHref(line.phone)}
              accessibilityLabel={t("lines.callWithName", { phone: line.phone, name: line.name })}
            />
          ))}
        </View>
      </View>

      {/* The crisis plan: 3 sections and the print of a wallet card. */}
      <Card style={styles.planCard}>
        <View style={styles.planHead}>
          <Text accessibilityRole="header" variant="headline">
            {t("plan.title")}
          </Text>
          <Text variant="footnote" color="textMuted" style={styles.planSub}>
            {t("plan.subtitle")}
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
              subtitle={filled ? t("plan.sectionFilled", { subtitle: s.subtitle }) : s.subtitle}
              onPress={() =>
                router.push({ pathname: "/plan/[section]", params: { section: s.id } })
              }
            />
          );
        })}
        <ListItem
          icon="printer"
          title={t("plan.print.title")}
          subtitle={t("plan.print.subtitle")}
          onPress={printCard}
        />
      </Card>

      {/* Quick calm. */}
      <Card style={styles.slimCard}>
        <ListItem
          icon="wind"
          title={t("calm.title")}
          subtitle={t("calm.subtitle")}
          trailing={<Badge tone="accent">{t("common:counts.minutes", { count: 2 })}</Badge>}
          onPress={() => router.push("/calm")}
        />
      </Card>

      {/* The mode for a third person: full screen, without personal data. */}
      <Card style={styles.slimCard}>
        <ListItem
          icon="heart-handshake"
          tone="info"
          title={t("handover.entry.title")}
          subtitle={t("handover.entry.subtitle")}
          onPress={() => router.push("/handover")}
        />
      </Card>

      {/* The guides render only when they have content (no dead rows). */}
      {GUIDES.length ? (
        <View>
          <SectionLabel>{t("guides.title")}</SectionLabel>
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

      {/* The contacts: one source in lines.ts. */}
      <View>
        <SectionLabel>{t("contacts.title")}</SectionLabel>
        <Card style={styles.sectionCard}>
          {CONTACT_LINES.map((line) => (
            <ListItem
              key={line.id}
              icon={line.icon}
              tone={line.tone}
              title={t("lines.nameWithPhone", { name: line.name, phone: line.phone })}
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
  /* The card of one line inside the crisis section. */
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
