/* IconButton — kulaté tlačítko jen s ikonou; vždy s českým `label`. */
import React from "react";
import { GestureResponderEvent, Pressable, StyleProp, StyleSheet, ViewStyle } from "react-native";
import { colors, radius } from "../theme";
import Icon from "./Icon";

type IconButtonVariant = "ghost" | "outline" | "ink";

/* Typ názvu ikony odvozujeme z Icon — drží krok s jeho unií názvů. */
type IconName = React.ComponentProps<typeof Icon>["name"];

/* currentColor v RN není — barva ikony podle varianty (barva textu ve webovém CSS) */
const ICON_COLORS: Record<IconButtonVariant, string> = {
  ghost: colors.textBody,
  outline: colors.textBody,
  ink: colors.textOnInk,
};

interface Props {
  icon: IconName;
  label: string;
  accessibilityHint?: string;
  variant?: IconButtonVariant;
  size?: number;
  iconSize?: number;
  onPress?: (e: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
}

export default function IconButton({
  icon,
  label,
  accessibilityHint,
  variant = "ghost",
  size = 44,
  iconSize = 22,
  onPress,
  style,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
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
