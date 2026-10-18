/* Nastavení (modal z Dnes a Přehledů): seskupený seznam — profil, připomínky,
   soukromí, haptika, štítky, záloha, o aplikaci. Minimum voleb s rozumnými
   výchozími hodnotami; vzhled se nenastavuje (sleduje systém) a nic
   nedubluje systémová nastavení (HIG Settings / Android settings patterns). */
import React from "react";
import { View } from "react-native";
import Constants from "expo-constants";
import { Card, Input, RadioRow, Switch, Text } from "../../ds";
import { SectionLabel } from "../../components/Header";
import Screen from "../../components/Screen";
import { useDb } from "../../db/provider";
import { useDbWriter } from "../../db/hooks";
import type { AgeBand } from "../../model";
import { useAppStore } from "../../store";
import { createThemedStyles } from "../../theme";
import BackupSection from "./BackupSection";
import { applyHapticsPreference, saveHapticsPreference } from "./preferences";
import RemindersSection from "./RemindersSection";
import TagsSection from "./TagsSection";

const AGE_OPTIONS: { id: AgeBand | null; label: string; meta: string }[] = [
  { id: "u26", label: "do 26 let", meta: "Primární linka: Linka bezpečí 116 111" },
  {
    id: "plus27",
    label: "27 a více",
    meta: "Primární linka: Linka první psychické pomoci 116 123",
  },
  { id: null, label: "Nechci uvádět", meta: "Pomoc nabídne obě linky" },
];

export default function SettingsScreen() {
  const { state, patch } = useAppStore();
  const db = useDb();
  const write = useDbWriter();
  const styles = useStyles();
  const [hapticsOn, setHapticsOn] = React.useState<boolean>(() => applyHapticsPreference(db));
  const version = Constants.expoConfig?.version ?? "0.1.0";

  const toggleHaptics = (value: boolean) => {
    setHapticsOn(value);
    write((d) => saveHapticsPreference(d, value));
  };

  return (
    <Screen keyboard>
      {/* profil — poprvé editovatelný i po onboardingu */}
      <View>
        <SectionLabel>Profil</SectionLabel>
        <Card style={styles.card}>
          <Input
            label="Jak ti říkat"
            placeholder="Třeba Alex"
            hint="Nepovinné — jen pro oslovení, nikam se neposílá."
            value={state.name}
            onChangeText={(v) => patch({ name: v })}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="done"
          />
          <Text variant="subheadline" weight="semibold" color="textBody">
            Věk
          </Text>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Věkové pásmo"
            style={styles.radios}
          >
            {AGE_OPTIONS.map((o) => (
              <RadioRow
                key={o.id ?? "none"}
                label={o.label}
                description={o.meta}
                selected={state.age === o.id}
                onPress={() => patch({ age: o.id })}
              />
            ))}
          </View>
        </Card>
      </View>

      <RemindersSection />

      {/* soukromí — label popisuje stav „zapnuto“, stav nese přepínač */}
      <View>
        <SectionLabel>Soukromí</SectionLabel>
        <Card style={styles.card}>
          <Switch
            checked={state.share}
            onChange={(v) => patch({ share: v })}
            label="Sdílet data pro výzkum"
            description="Anonymně a jen pokud to tady zapneš. Záznamy jinak zůstávají v telefonu."
          />
        </Card>
      </View>

      <View>
        <SectionLabel>Haptika</SectionLabel>
        <Card style={styles.card}>
          <Switch
            checked={hapticsOn}
            onChange={toggleHaptics}
            label="Haptická odezva"
            description="Jemné vibrace u dechu, výběru a uložení."
          />
        </Card>
      </View>

      <TagsSection />

      <BackupSection />

      <View>
        <SectionLabel>O aplikaci</SectionLabel>
        <Card style={styles.card}>
          <Text variant="body" color="textStrong">
            Lumi {version}
          </Text>
          <Text variant="subheadline" color="textMuted">
            Záznamy zůstávají jen v tomhle telefonu, šifrované. Žádné účty, žádná reklama, žádné
            sledování.
          </Text>
        </Card>
      </View>
    </Screen>
  );
}

const useStyles = createThemedStyles(() => ({
  card: { marginTop: 6, gap: 12 },
  radios: { gap: 10 },
}));
