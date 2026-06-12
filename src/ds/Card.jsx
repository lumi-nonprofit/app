/* Card — základní plocha Lumi: bílá, rádius 22 px, měkký teplý stín, bez borderu.
   Doplněk nad rámec DS: klikatelná karta je přístupná i z klávesnice/čtečky
   (role tlačítka — WCAG záměr z webové verze). */
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, radius, shadow, space } from "../theme.js";

export default function Card({ children, variant = "default", onPress, style }) {
  const variantStyle =
    variant === "sunken" ? styles.sunken : variant === "ink" ? styles.ink : styles.default;
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.card, variantStyle, style, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, variantStyle, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: space.s5 },
  default: { backgroundColor: colors.surfaceCard, ...shadow.card },
  /* sunken: bez stínu */
  sunken: { backgroundColor: colors.surfaceSunken },
  /* ink: text uvnitř obarvují volající (textOnInk) */
  ink: { backgroundColor: colors.surfaceInk, ...shadow.card },
  pressed: { transform: [{ scale: 0.99 }] },
});
