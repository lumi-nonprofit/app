/* Card — základní plocha Lumi: karta s rádiusem 22, měkkým teplým stínem (light)
   nebo hairline (dark — stíny nejsou vidět). Klikatelná karta je přístupná
   (role button) a má press state podle platformy. */
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
  /* sunken: bez stínu */
  sunken: { backgroundColor: t.colors.surfaceSunken },
  /* ink: text uvnitř obarvují volající (textOnPrimary) */
  ink: { backgroundColor: t.colors.surfacePrimary, ...t.elevation.card },
}));
