/* Editor jedné sekce krizového plánu (app/plan/[section]). Otevírá se
   z Pomoci, ukládá jen svou sekci do `settings`. Tón klidný a věcný:
   žádné hodnocení obsahu, žádný tlak — text je čistě uživatelův a zůstává
   v telefonu. Neplatná sekce v URL → zpět do Pomoci. */
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { Input, IconButton } from "../../ds/index";
import LumiCTA from "../../components/CTA";
import Screen from "../../components/Screen";
import { LumiHeader } from "../../components/Header";
import { useDb } from "../../db/provider";
import { useDbWriter } from "../../db/hooks";
import { getSetting, setSetting } from "../../db/repo";
import { PLAN_SECTIONS, PLAN_SECTION_KEYS, isPlanSectionId, type PlanSectionId } from "./plan";
import { colors, font, leading, type } from "../../theme";

export default function PlanSectionScreen() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  if (!isPlanSectionId(section)) return <Redirect href="/help" />;
  /* key: změna parametru routy musí znamenat čistý stav editoru */
  return <PlanSection key={section} section={section} />;
}

function PlanSection({ section }: { section: PlanSectionId }) {
  const router = useRouter();
  const db = useDb();
  const write = useDbWriter();

  const meta = PLAN_SECTIONS.find((s) => s.id === section);
  const key = PLAN_SECTION_KEYS[section];

  /* počáteční hodnota se čte jednou při otevření (lazy initializer) */
  const [value, setValue] = React.useState<string>(() => getSetting<string>(db, key) ?? "");

  /* meta je vždy nalezeno (section prošlo isPlanSectionId) — pojistka pro TS */
  if (!meta) return <Redirect href="/help" />;

  const save = () => {
    write((d) => setSetting(d, key, value.trim()));
    router.back();
  };

  return (
    <Screen>
      <View style={styles.topRow}>
        <IconButton
          icon="arrow-left"
          label="Zpět bez uložení"
          accessibilityHint="Vrátí se do Pomoci a změny v této sekci neuloží."
          onPress={() => router.back()}
        />
      </View>

      <LumiHeader kicker="Krizový plán" title={meta.title} />
      <Text style={styles.subtitle}>{meta.subtitle}</Text>

      {/* viditelný titulek nese LumiHeader výš — Inputu dáme jen přístupný
          popisek (jinak by se titulek opakoval dvakrát) */}
      <Input
        multiline
        rows={6}
        value={value}
        onChangeText={setValue}
        placeholder={meta.placeholder}
        accessibilityLabel={meta.title}
        accessibilityHint="Text zůstává jen v tvém telefonu."
      />

      <View style={styles.actions}>
        <LumiCTA onPress={save}>Uložit</LumiCTA>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: "row", alignItems: "center", marginHorizontal: -6 },
  subtitle: {
    ...font.body(400),
    fontSize: type.base,
    lineHeight: leading.body(type.base),
    color: colors.textMuted,
    paddingHorizontal: 4,
  },
  actions: { marginTop: 8 },
});
