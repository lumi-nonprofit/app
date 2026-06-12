/* Onboarding 2 — věk (určuje primární krizovou linku) */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import LumiCTA from "../../components/CTA";
import type { AgeBand } from "../../model";
import { useAppStore } from "../../store";
import { palette, colors, radius, font, shadow, type } from "../../theme";
import { ObShell, ObTitle } from "./Shell";

export default function AgeStep() {
  const { state, patch } = useAppStore();
  const router = useRouter();
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
        {options.map((o) => {
          const is = age === o.id;
          return (
            <Pressable
              key={o.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: is }}
              onPress={() => patch({ age: o.id })}
              style={({ pressed }) => [
                styles.opt,
                is && styles.optSelected,
                pressed && { transform: [{ scale: 0.99 }] },
              ]}
            >
              <View style={[styles.optRadio, is && styles.optRadioSelected]} accessible={false}>
                {is ? <View style={styles.optDot} /> : null}
              </View>
              <View style={styles.flex1}>
                <Text style={styles.optLabel}>{o.label}</Text>
                <Text style={styles.optMeta}>{o.meta}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.flex1} />
      <LumiCTA
        disabled={!age}
        onPress={() => router.push("/onboarding/privacy")}
        hint="Vyber jedno z pásem — jde jen o krizovou linku."
      >
        Pokračovat
      </LumiCTA>
    </ObShell>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  /* .lumi-opt */
  optGroup: { flexDirection: "column", gap: 12 },
  opt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    minHeight: 64,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1.5,
    borderColor: "transparent",
    borderRadius: radius.lg,
    ...shadow.card,
  },
  optSelected: { borderColor: palette.sun400, ...shadow.glow },
  optRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  optRadioSelected: { borderColor: palette.sun500 },
  optDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: palette.sun500 },
  optLabel: { ...font.body(600), fontSize: type.md, color: colors.textStrong },
  optMeta: { ...font.body(400), fontSize: type.sm, color: palette.ink700, marginTop: 2 },
});
