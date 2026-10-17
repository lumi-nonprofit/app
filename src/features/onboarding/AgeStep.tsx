/* Onboarding 2 — věk (určuje primární krizovou linku); jde neuvést —
   Pomoc pak nabízí obě linky rovnocenně. */
import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Button, RadioRow } from "../../ds";
import type { AgeBand } from "../../model";
import { useAppStore } from "../../store";
import { createThemedStyles } from "../../theme";
import { ObShell, ObTitle } from "./Shell";

const OPTIONS: { id: AgeBand | null; label: string; meta: string }[] = [
  { id: "u26", label: "do 26 let", meta: "Primární linka: Linka bezpečí 116 111" },
  {
    id: "plus27",
    label: "27 a více",
    meta: "Primární linka: Linka první psychické pomoci 116 123",
  },
  { id: null, label: "Nechci uvádět", meta: "Pomoc nabídne obě linky" },
];

export default function AgeStep() {
  const { state, patch } = useAppStore();
  const router = useRouter();
  const styles = useStyles();
  const age = state.age;
  /* „Nechci uvádět“ je platná volba — drží se lokálně, do profilu jde age: null */
  const [declined, setDeclined] = React.useState(false);
  return (
    <ObShell step={2} onBack={() => router.back()}>
      <ObTitle title="Kolik ti je?" body="Podle věku ti nabídneme správnou krizovou linku." />
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Věkové pásmo"
        accessibilityHint="Podle věku se nastaví primární krizová linka."
        style={styles.optGroup}
      >
        {OPTIONS.map((o) => (
          <RadioRow
            key={o.id ?? "none"}
            label={o.label}
            description={o.meta}
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
