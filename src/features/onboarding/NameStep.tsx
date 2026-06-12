/* Onboarding 1 — přivítání + jméno */
import React from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Input } from "../../ds/index";
import LumiCTA from "../../components/CTA";
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
        hint="Jen pro oslovení — nikam se neposílá."
        value={state.name}
        onChangeText={(v) => patch({ name: v })}
      />
      <View style={styles.flex1} />
      <LumiCTA
        disabled={!state.name.trim()}
        onPress={() => router.push("/onboarding/age")}
        hint="Stačí napsat, jak ti máme říkat."
      >
        Pokračovat
      </LumiCTA>
    </ObShell>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  mark: { marginBottom: 18 },
});
