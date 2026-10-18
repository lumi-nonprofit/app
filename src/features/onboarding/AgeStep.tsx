/* Step 2 of the onboarding: the age (it sets the primary crisis line). The person can decline;
   Help then offers both lines as equals. */
import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Button, RadioRow } from "../../ds";
import { useTranslation } from "../../i18n";
import type { AgeBand } from "../../model";
import { useAppStore } from "../../store";
import { createThemedStyles } from "../../theme";
import { ObShell, ObTitle } from "./Shell";

/* The choices read their texts from `common:ageBands`; `null` is the choice not to say. */
const OPTIONS: { id: AgeBand | null; band: "u26" | "plus27" | "none" }[] = [
  { id: "u26", band: "u26" },
  { id: "plus27", band: "plus27" },
  { id: null, band: "none" },
];

export default function AgeStep() {
  const { t } = useTranslation(["onboarding", "common"]);
  const { state, patch } = useAppStore();
  const router = useRouter();
  const styles = useStyles();
  const age = state.age;
  /* "Nechci uvádět" is a valid choice: it stays local, and the profile gets age: null. */
  const [declined, setDeclined] = React.useState(false);
  return (
    <ObShell step={2} onBack={() => router.back()}>
      <ObTitle title={t("age.title")} body={t("age.body")} />
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t("age.group.a11yLabel")}
        accessibilityHint={t("age.group.a11yHint")}
        style={styles.optGroup}
      >
        {OPTIONS.map((o) => (
          <RadioRow
            key={o.band}
            label={t(`common:ageBands.${o.band}.label`)}
            description={t(`common:ageBands.${o.band}.meta`)}
            selected={o.id === null ? declined && age === null : age === o.id}
            onPress={() => {
              setDeclined(o.id === null);
              patch({ age: o.id });
            }}
          />
        ))}
      </View>
      <View style={styles.flex1} />
      <Button
        size="lg"
        fullWidth
        disabled={!age && !declined}
        onPress={() => router.push("/onboarding/privacy")}
        hint={t("age.continueHint")}
      >
        {t("common:actions.continue")}
      </Button>
    </ObShell>
  );
}

const useStyles = createThemedStyles(() => ({
  flex1: { flex: 1 },
  optGroup: { flexDirection: "column", gap: 12, marginBottom: 24 },
}));
