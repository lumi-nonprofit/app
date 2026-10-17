/* Onboarding 2 — věk (určuje primární krizovou linku) */
import React from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "../../ds";
import { pressFeedback, pressedStyle } from "../../ds/press";
import LumiCTA from "../../components/CTA";
import type { AgeBand } from "../../model";
import { useAppStore } from "../../store";
import { createThemedStyles, useTheme } from "../../theme";
import { ObShell, ObTitle } from "./Shell";

export default function AgeStep() {
  const { state, patch } = useAppStore();
  const router = useRouter();
  const theme = useTheme();
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
        {options.map((o) => {
          const is = age === o.id;
          return (
            <Pressable
              key={o.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: is }}
              onPress={() => patch({ age: o.id })}
              {...pressFeedback(theme)}
              style={({ pressed }) => [
                styles.opt,
                is && styles.optSelected,
                pressedStyle(theme, pressed),
              ]}
            >
              {/* vybranou volbu nese i tvar (vyplněný terčík) a obrys ≥ 3:1, ne jen barva */}
              <View style={[styles.optRadio, is && styles.optRadioSelected]} accessible={false}>
                {is ? <View style={styles.optDot} /> : null}
              </View>
              <View style={styles.flex1}>
                <Text variant="body" weight="semibold" color="textStrong">
                  {o.label}
                </Text>
                <Text variant="footnote" color="textMuted" style={styles.optMeta}>
                  {o.meta}
                </Text>
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

const useStyles = createThemedStyles((t) => ({
  flex1: { flex: 1 },
  optGroup: { flexDirection: "column", gap: 12, marginBottom: 24 },
  opt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    minHeight: 64,
    backgroundColor: t.colors.surfaceCard,
    borderWidth: 1.5,
    borderColor: t.scheme === "dark" ? t.colors.borderSubtle : "transparent",
    borderRadius: t.radius.lg,
    overflow: "hidden",
    ...t.elevation.card,
  },
  optSelected: { borderColor: t.colors.selectionBorder },
  optRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: t.colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  optRadioSelected: { borderColor: t.colors.accentFill },
  optDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: t.colors.accentFill },
  optMeta: { marginTop: 2 },
}));
