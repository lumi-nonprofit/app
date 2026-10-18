/* Settings (a modal from Home and from the overviews): a grouped list with the profile, the
   reminders, privacy, haptics, tags, backup and the about section. A minimum of options with
   sensible defaults. The appearance is not a setting (it follows the system) and nothing
   duplicates the system settings (HIG Settings, Android settings patterns). */
import React from "react";
import { View } from "react-native";
import Constants from "expo-constants";
import { Card, Input, RadioRow, Switch, Text } from "../../ds";
import { SectionLabel } from "../../components/Header";
import Screen from "../../components/Screen";
import { useDb } from "../../db/provider";
import { useDbWriter } from "../../db/hooks";
import { useTranslation } from "../../i18n";
import type { AgeBand } from "../../model";
import { useAppStore } from "../../store";
import { createThemedStyles } from "../../theme";
import BackupSection from "./BackupSection";
import { applyHapticsPreference, saveHapticsPreference } from "./preferences";
import RemindersSection from "./RemindersSection";
import TagsSection from "./TagsSection";

interface AgeOption {
  id: AgeBand | null;
  label: string;
  meta: string;
}

export default function SettingsScreen() {
  const { t } = useTranslation(["settings", "common"]);
  const { state, patch } = useAppStore();
  const db = useDb();
  const write = useDbWriter();
  const styles = useStyles();
  const [hapticsOn, setHapticsOn] = React.useState<boolean>(() => applyHapticsPreference(db));
  const version = Constants.expoConfig?.version ?? "0.1.0";

  /* The age bands and their texts come from the common catalog (the onboarding reads the same). */
  const ageOptions: AgeOption[] = [
    { id: "u26", label: t("common:ageBands.u26.label"), meta: t("common:ageBands.u26.meta") },
    {
      id: "plus27",
      label: t("common:ageBands.plus27.label"),
      meta: t("common:ageBands.plus27.meta"),
    },
    { id: null, label: t("common:ageBands.none.label"), meta: t("common:ageBands.none.meta") },
  ];

  const toggleHaptics = (value: boolean) => {
    setHapticsOn(value);
    write((d) => saveHapticsPreference(d, value));
  };

  return (
    <Screen keyboard>
      {/* The profile: the first place where the person can edit it after the onboarding. */}
      <View>
        <SectionLabel>{t("profile.title")}</SectionLabel>
        <Card style={styles.card}>
          <Input
            label={t("profile.name.label")}
            placeholder={t("profile.name.placeholder")}
            hint={t("profile.name.hint")}
            value={state.name}
            onChangeText={(v) => patch({ name: v })}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="done"
          />
          <Text variant="subheadline" weight="semibold" color="textBody">
            {t("profile.age.label")}
          </Text>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={t("profile.age.a11yLabel")}
            style={styles.radios}
          >
            {ageOptions.map((o) => (
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

      {/* Privacy: the label describes the state "on"; the switch carries the state. */}
      <View>
        <SectionLabel>{t("privacy.title")}</SectionLabel>
        <Card style={styles.card}>
          <Switch
            checked={state.share}
            onChange={(v) => patch({ share: v })}
            label={t("privacy.share.label")}
            description={t("privacy.share.description")}
          />
        </Card>
      </View>

      <View>
        <SectionLabel>{t("haptics.title")}</SectionLabel>
        <Card style={styles.card}>
          <Switch
            checked={hapticsOn}
            onChange={toggleHaptics}
            label={t("haptics.toggle.label")}
            description={t("haptics.toggle.description")}
          />
        </Card>
      </View>

      <TagsSection />

      <BackupSection />

      <View>
        <SectionLabel>{t("about.title")}</SectionLabel>
        <Card style={styles.card}>
          <Text variant="body" color="textStrong">
            {t("about.version", { version })}
          </Text>
          <Text variant="subheadline" color="textMuted">
            {t("about.privacy")}
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
