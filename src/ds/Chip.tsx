/* Chip — pill pro slova a štítky. Výběr = zlatý wash + obrys sun600 (≥ 3:1)
   + fajfka, nikdy jen barva. Dotykový cíl ≥ 44/48 pt; `accessibilityActions`
   dávají čtečce negestovou alternativu k dlouhému podržení (smazání štítku). */
import React from "react";
import { Pressable } from "react-native";
import type {
  AccessibilityActionEvent,
  AccessibilityActionInfo,
  GestureResponderEvent,
  StyleProp,
  ViewStyle,
} from "react-native";
import { createThemedStyles, useTheme } from "../theme";
import Icon from "./Icon";
import { pressFeedback, pressedStyle } from "./press";
import Text from "./Text";

interface Props {
  children: React.ReactNode;
  selected?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  /** Dlouhé podržení (např. mazání vlastního štítku) — bez vizuální změny chipu. */
  onLongPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityActions?: readonly AccessibilityActionInfo[];
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
  style?: StyleProp<ViewStyle>;
}

export default function Chip({
  children,
  selected = false,
  onPress,
  onLongPress,
  accessibilityLabel,
  accessibilityHint,
  accessibilityActions,
  onAccessibilityAction,
  style,
}: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const textColor = selected ? "textAccent" : "textBody";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: !!selected }}
      accessibilityHint={accessibilityHint}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}
      onPress={onPress}
      onLongPress={onLongPress}
      {...pressFeedback(theme)}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selected,
        style,
        !!onPress && pressedStyle(theme, pressed),
      ]}
    >
      {selected ? (
        <Icon name="check" size={14} weight="semibold" color={theme.colors[textColor]} />
      ) : null}
      {React.Children.map(children, (child) =>
        typeof child === "string" || typeof child === "number" ? (
          <Text
            variant="subheadline"
            weight="medium"
            color={textColor}
            maxFontSizeMultiplier={1.6}
            style={styles.text}
          >
            {child}
          </Text>
        ) : (
          child
        ),
      )}
    </Pressable>
  );
}

const useStyles = createThemedStyles((t) => ({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: t.platform.minTouch,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: t.radius.pill,
    borderWidth: 1.5,
    borderColor: t.colors.borderStrong,
    backgroundColor: t.colors.surfaceCard,
    overflow: "hidden",
  },
  selected: {
    backgroundColor: t.colors.accentSoft,
    borderColor: t.colors.selectionBorder,
  },
  text: { flexShrink: 1 },
}));
