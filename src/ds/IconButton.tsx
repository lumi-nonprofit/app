/* IconButton — kulaté tlačítko jen s ikonou; vždy s českým `label`.
   Dotykový cíl 44 pt (HIG) / 48 dp (Android), press state podle platformy. */
import React from "react";
import { GestureResponderEvent, Pressable, StyleProp, ViewStyle } from "react-native";
import { createThemedStyles, useTheme } from "../theme";
import Icon from "./Icon";
import { pressFeedback, pressedStyle } from "./press";

type IconButtonVariant = "ghost" | "outline" | "ink";

/* Typ názvu ikony odvozujeme z Icon — drží krok s jeho unií názvů. */
type IconName = React.ComponentProps<typeof Icon>["name"];

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
  size,
  iconSize = 22,
  onPress,
  style,
}: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const dimension = size ?? theme.platform.minTouch;
  const iconColor = variant === "ink" ? theme.colors.textOnPrimary : theme.colors.textBody;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      {...pressFeedback(theme, { borderless: true, radius: dimension / 2 })}
      style={({ pressed }) => [
        styles.btn,
        variant === "outline" && styles.outline,
        variant === "ink" && styles.ink,
        { width: dimension, height: dimension },
        style,
        pressedStyle(theme, pressed),
      ]}
    >
      <Icon name={icon} size={iconSize} color={iconColor} />
    </Pressable>
  );
}

const useStyles = createThemedStyles((t) => ({
  btn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: t.radius.pill,
    borderWidth: 1.5,
    borderColor: "transparent",
    backgroundColor: "transparent",
  },
  outline: { borderColor: t.colors.borderStrong, backgroundColor: t.colors.surfaceCard },
  ink: { backgroundColor: t.colors.surfacePrimary },
}));
