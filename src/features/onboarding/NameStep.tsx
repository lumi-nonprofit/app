/* Onboarding 1 — přivítání + jméno (nepovinné; bez něj Lumi oslovuje neutrálně).
   HIG Onboarding: rychlý, přeskočitelný; multi-step tlačítka Začít → Pokračovat → Hotovo. */
import React from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Input } from "../../ds";
import LumiMark from "../../components/LumiMark";
import { useAppStore } from "../../store";
import { ObShell, ObTitle } from "./Shell";

export default function NameStep() {
  const { state, patch } = useAppStore();
  const router = useRouter();
  return (
    <ObShell step={1}>
      <LumiMark size={52} style={styles.mark} />
      <ObTitle
        title="Ahoj, tady Lumi."
        body="Pomůžu ti všímat si, jak se máš, a hledat, co ti dělá dobře. Všechno zůstává u tebe."
      />
      <Input
        label="Jak ti máme říkat?"
        placeholder="Třeba Alex"
        hint="Nepovinné — jen pro oslovení, nikam se neposílá."
        value={state.name}
        onChangeText={(v) => patch({ name: v })}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="done"
      />
      <View style={styles.flex1} />
      <Button size="lg" fullWidth onPress={() => router.push("/onboarding/age")}>
        Začít
      </Button>
    </ObShell>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  mark: { marginBottom: 18 },
});
