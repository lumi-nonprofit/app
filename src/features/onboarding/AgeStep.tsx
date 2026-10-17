/* Onboarding 2 — věk (určuje primární krizovou linku) */
import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Button, RadioRow } from "../../ds";
import type { AgeBand } from "../../model";
import { useAppStore } from "../../store";
import { createThemedStyles } from "../../theme";
import { ObShell, ObTitle } from "./Shell";

export default function AgeStep() {
  const { state, patch } = useAppStore();
  const router = useRouter();
  const styles = useStyles();
  const age = state.age;
  const options: { id: AgeBand; label: string; meta: string }[] = [
    { id: "u26", label: "do 26 let", meta: "Primární linka: Linka bezpečí 116 111" },
    {
      id: "plus27",
      label: "27 a více",
      meta: "Primární linka: Linka první psychické pomoci 116 123",
    },
  ];
  return (
    <ObShell step={2} onBack={() => router.back()}>
      <ObTitle title="Kolik ti je?" body="Podle věku ti nabídneme správnou krizovou linku." />
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Věkové pásmo"
        accessibilityHint="Podle věku se nastaví primární krizová linka."
        style={styles.optGroup}
      >
        {options.map((o) => (
          <RadioRow
            key={o.id}
            label={o.label}
            description={o.meta}
            selected={age === o.id}
            onPress={() => patch({ age: o.id })}
          />
        ))}
      </View>
      <View style={styles.flex1} />
      <Button
        size="lg"
        fullWidth
        disabled={!age}
        onPress={() => router.push("/onboarding/privacy")}
        hint="Vyber jedno z pásem — jde jen o krizovou linku."
      >
        Pokračovat
      </Button>
    </ObShell>
  );
}

const useStyles = createThemedStyles(() => ({
  flex1: { flex: 1 },
  optGroup: { flexDirection: "column", gap: 12, marginBottom: 24 },
}));
