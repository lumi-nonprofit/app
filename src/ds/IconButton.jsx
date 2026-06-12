/* IconButton — kulaté tlačítko jen s ikonou; vždy s českým `label`. */
import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { colors, radius } from "../theme.js";
import Icon from "./Icon.jsx";

/* currentColor v RN není — barva ikony podle varianty (barva textu ve webovém CSS) */
const ICON_COLORS = {
  ghost: colors.textBody,
  outline: colors.textBody,
  ink: colors.textOnInk,
};

export default function IconButton({
  icon,
  label,
  variant = "ghost",
  size = 44,
  iconSize = 22,
  onPress,
  style,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        variant === "outline" && styles.outline,
        variant === "ink" && styles.ink,
        { width: size, height: size },
        style,
        pressed && styles.pressed,
      ]}
    >
      <Icon name={icon} size={iconSize} color={ICON_COLORS[variant] || colors.textBody} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: "transparent",
    backgroundColor: "transparent",
  },
  outline: { borderColor: colors.borderStrong, backgroundColor: colors.surfaceCard },
  ink: { backgroundColor: colors.surfaceInk },
  pressed: { transform: [{ scale: 0.95 }] },
});
