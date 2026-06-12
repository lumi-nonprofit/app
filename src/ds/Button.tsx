/* Button — pill tlačítko pro všechny akce Lumi; primary je plný ink (nikdy zlatá —
   zlatá jako výplň neprojde kontrastem). Crisis = plný clay.
   Doplněk nad rámec DS: `href` otevírá odkaz přes Linking se stejným vzhledem (tel: linky). */
import React from "react";
import {
  GestureResponderEvent,
  Linking,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from "react-native";
import { colors, font, leading, palette, radius, type } from "../theme";

type ButtonVariant = "primary" | "secondary" | "soft" | "ghost" | "crisis";
type ButtonSize = "sm" | "md" | "lg";

const TEXT_COLORS: Record<ButtonVariant, string> = {
  primary: colors.textOnInk,
  secondary: colors.textStrong,
  soft: palette.sun700,
  ghost: colors.textBody,
  crisis: colors.textOnAccent,
};
const TEXT_SIZES: Record<ButtonSize, number> = { sm: type.sm, md: type.base, lg: type.md };

interface Props {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  onPress?: (e: GestureResponderEvent) => void;
  href?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  onPress,
  href,
  style,
  textStyle,
}: Props) {
  const handlePress = (e: GestureResponderEvent) => {
    if (disabled) return;
    if (onPress) onPress(e);
    if (href) Linking.openURL(href);
  };

  /* Stringové děti obalíme do <Text>; sousední texty slučujeme do jednoho uzlu,
     aby je gap 8 neroztrhal. Krajní mezery (JSX kolem ikon) odřezáváme — web je
     kolaboval; mezeru mezi ikonou a textem dělá gap. Elementy (Icon) zůstávají
     beze změny — barvu jim předává volající explicitně. */
  const fontSize = TEXT_SIZES[size] || TEXT_SIZES.md;
  const textStyles: StyleProp<TextStyle> = [
    styles.text,
    {
      fontSize,
      lineHeight: leading.body(fontSize),
      color: TEXT_COLORS[variant] || TEXT_COLORS.primary,
    },
    textStyle,
  ];
  const content: React.ReactNode[] = [];
  let run = "";
  const flush = () => {
    const piece = run.trim();
    run = "";
    if (piece) {
      content.push(
        <Text key={`text-${content.length}`} style={textStyles}>
          {piece}
        </Text>,
      );
    }
  };
  React.Children.toArray(children).forEach((child) => {
    if (typeof child === "string" || typeof child === "number") {
      run += child;
    } else {
      flush();
      content.push(child);
    }
  });
  flush();

  return (
    <Pressable
      accessibilityRole={href ? "link" : "button"}
      accessibilityState={{ disabled: !!disabled }}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        styles[variant] || styles.primary,
        styles[size] || styles.md,
        fullWidth && styles.full,
        disabled && styles.disabled,
        style,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: "transparent",
  },

  /* varianty */
  primary: { backgroundColor: colors.surfaceInk },
  secondary: { backgroundColor: colors.surfaceCard, borderColor: colors.borderStrong },
  soft: { backgroundColor: colors.accentSoft },
  ghost: { backgroundColor: "transparent" },
  crisis: { backgroundColor: palette.clay500 },

  /* velikosti */
  sm: { paddingVertical: 7, paddingHorizontal: 14, minHeight: 32 },
  md: { paddingVertical: 10, paddingHorizontal: 20, minHeight: 44 },
  lg: { paddingVertical: 14, paddingHorizontal: 28, minHeight: 52 },

  full: { width: "100%" },
  disabled: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.98 }] },

  text: { ...font.body(600) },
});
