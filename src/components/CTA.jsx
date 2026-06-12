/* LumiCTA — hlavní akce obrazovky s přístupným disabled stavem:
   obrys + inkoustový text na zapuštěném podkladu (kontrast ≥ 4,5:1),
   ne jen světle šedý text. Disabled stav vysvětluje hint pod tlačítkem. */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { palette, colors, radius, font, leading } from "../theme.js";

export default function LumiCTA({ children, disabled, onPress, variant = "primary", hint }) {
  const secondary = variant === "secondary";
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        onPress={disabled ? undefined : onPress}
        style={({ pressed }) => [
          styles.btn,
          secondary && styles.btnSecondary,
          disabled && styles.btnDisabled,
          pressed && !disabled && styles.btnPressed,
        ]}
      >
        <Text style={[styles.label, secondary && styles.labelSecondary, disabled && styles.labelDisabled]}>
          {children}
        </Text>
      </Pressable>
      {disabled && hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "column", gap: 8 },
  btn: {
    minHeight: 52,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceInk,
  },
  btnSecondary: { backgroundColor: colors.surfaceCard, borderColor: colors.borderStrong },
  /* disabled: obrys + inkoustový text na zapuštěném podkladu, ne opacita */
  btnDisabled: { backgroundColor: colors.surfaceSunken, borderColor: colors.borderStrong },
  btnPressed: { transform: [{ scale: 0.98 }] },
  label: { ...font.body(600), fontSize: 17, color: colors.textOnInk },
  labelSecondary: { color: colors.textStrong },
  labelDisabled: { color: palette.ink700 },
  hint: {
    ...font.body(400),
    fontSize: 13,
    lineHeight: leading.body(13),
    color: palette.ink700,
    textAlign: "center",
  },
});
