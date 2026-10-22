/* Card: the basic surface of Lumi: a card with the radius 22, a soft warm shadow (light)
   or a hairline (dark: shadows are not visible). A tappable card is accessible
   (the role button) and has a press state that follows the platform. */
import React from "react";
import { Pressable, View } from "react-native";
import type { GestureResponderEvent, StyleProp, ViewStyle } from "react-native";
import { createThemedStyles, useTheme } from "../theme";
import { pressFeedback, pressedStyle } from "./press";

type CardVariant = "default" | "sunken" | "ink";

interface Props {
  children: React.ReactNode;
  variant?: CardVariant;
  onPress?: (event: GestureResponderEvent) => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

export default function Card({
  children,
  variant = "default",
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
}: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const variantStyle =
    variant === "sunken" ? styles.sunken : variant === "ink" ? styles.ink : styles.default;
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        onPress={onPress}
        {...pressFeedback(theme)}
        style={({ pressed }) => [styles.card, variantStyle, style, pressedStyle(theme, pressed)]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, variantStyle, style]}>{children}</View>;
}

const useStyles = createThemedStyles((t) => ({
  card: { borderRadius: t.radius.lg, padding: t.space.s5, overflow: "hidden" },
  default: { backgroundColor: t.colors.surfaceCard, ...t.elevation.card, ...t.cardBorder },
  /* sunken: no shadow */
  sunken: { backgroundColor: t.colors.surfaceSunken },
  /* ink: the callers color the text inside (textOnPrimary) */
  ink: { backgroundColor: t.colors.surfacePrimary, ...t.elevation.card },
}));
