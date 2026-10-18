/* The editor of one crisis plan section (app/plan/[section]). It opens from Help and saves only
   its own section into `settings`. The tone is calm and factual: the app does not rate the
   content and does not push. The text belongs to the user and stays on the phone. An invalid
   section in the URL leads back to Help. */
import React from "react";
import { View } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { Button, Input, Text } from "../../ds";
import Screen from "../../components/Screen";
import { LumiHeader } from "../../components/Header";
import { useDb } from "../../db/provider";
import { useDbWriter } from "../../db/hooks";
import { getSetting, setSetting } from "../../db/repo";
import { useTranslation } from "../../i18n";
import { useDiscardGuard } from "../../lib/useDiscardGuard";
import { PLAN_SECTIONS, PLAN_SECTION_KEYS, isPlanSectionId, type PlanSectionId } from "./plan";
import { createThemedStyles } from "../../theme";

export default function PlanSectionScreen() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  if (!isPlanSectionId(section)) return <Redirect href="/help" />;
  /* The key: a change of the route parameter must give a clean editor state. */
  return <PlanSection key={section} section={section} />;
}

function PlanSection({ section }: { section: PlanSectionId }) {
  const { t } = useTranslation(["help", "common"]);
  const router = useRouter();
  const db = useDb();
  const write = useDbWriter();
  const styles = useStyles();

  const meta = PLAN_SECTIONS.find((s) => s.id === section);
  const key = PLAN_SECTION_KEYS[section];

  /* The editor reads the initial value once, when it opens (lazy initializer). */
  const [initial] = React.useState<string>(() => getSetting<string>(db, key) ?? "");
  const [value, setValue] = React.useState<string>(initial);
  /* Back with an unsaved change asks first; Save leaves without a question. */
  const { leave } = useDiscardGuard({
    dirty: value.trim() !== initial.trim(),
    title: t("plan.discard.title"),
    message: t("plan.discard.message"),
  });

  /* The meta always exists (the section passed isPlanSectionId); this guard is for TypeScript. */
  if (!meta) return <Redirect href="/help" />;

  const save = () => {
    write((d) => setSetting(d, key, value.trim()));
    leave(() => router.back());
  };

  return (
    <Screen keyboard>
      {/* The native header carries the title "Krizový plán" and the system Back. */}
      <LumiHeader title={meta.title} />
      <Text variant="body" color="textMuted" style={styles.subtitle}>
        {meta.subtitle}
      </Text>

      {/* LumiHeader above carries the visible title; the Input gets only an accessible label
          (otherwise a screen reader would read the title twice). */}
      <Input
        multiline
        rows={6}
        value={value}
        onChangeText={setValue}
        placeholder={meta.placeholder}
        accessibilityLabel={meta.title}
        accessibilityHint={t("plan.editor.a11yHint")}
      />

      <View style={styles.actions}>
        <Button size="lg" fullWidth onPress={save}>
          {t("common:actions.save")}
        </Button>
      </View>
    </Screen>
  );
}

const useStyles = createThemedStyles(() => ({
  subtitle: { paddingHorizontal: 4 },
  actions: { marginTop: 8 },
}));
