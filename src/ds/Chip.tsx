/* Chip — pill pro štítky a odpovědi; výběr = zlatý wash + glow ring. */
import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import type { GestureResponderEvent, StyleProp, ViewStyle } from "react-native";
import { colors, font, leading, palette, radius, shadow, type } from "../theme";

interface Props {
  children: React.ReactNode;
  selected?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
}

export default function Chip({ children, selected = false, onPress, style }: Props) {
  const textColor = selected ? palette.sun700 : colors.textBody;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selected,
        style,
        pressed && !!onPress && styles.pressed,
      ]}
    >
      {React.Children.map(children, (child) =>
        typeof child === "string" || typeof child === "number" ? (
          <Text style={[styles.text, { color: textColor }]}>{child}</Text>
        ) : (
          child
        ),
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceCard,
  },
  selected: {
    backgroundColor: colors.accentSoft,
    borderColor: palette.sun400,
    ...shadow.glow,
  },
  pressed: { transform: [{ scale: 0.98 }] },
  text: {
    ...font.body(500),
    fontSize: type.sm,
    lineHeight: leading.body(type.sm),
  },
});
