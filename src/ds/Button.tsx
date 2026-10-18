/* Button: the pill button for every action in Lumi.
   `primary` is solid ink: gold as a fill does not pass the contrast check. `crisis` is
   clay700 with white text (6.5:1); in dark mode clay300 with ink text. `soft` is a gold
   wash with sun700 text. Disabled = an outline + ink text on the sunken surface, NEVER a
   lower opacity (README, ADR 0001 §11). The optional `hint` under the button says what the
   user still needs. Press state: Android ripple, iOS opacity (HIG Buttons). The busy state
   shows an indicator and an optional replacement label (`loadingLabel`, "Ukládám…"). `href`
   opens the link through `Linking` with the same look (tel: lines) and the role link. The
   label scales with Dynamic Type up to 2× (HIG: do not clip the button text, the height
   grows). */
import React from "react";
import {
  ActivityIndicator,
  GestureResponderEvent,
  Linking,
  Pressable,
  StyleProp,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { createThemedStyles, useTheme } from "../theme";
import { pressFeedback, pressedStyle } from "./press";
import Text, { type TextColor, type TextVariant } from "./Text";

export type ButtonVariant = "primary" | "secondary" | "soft" | "ghost" | "crisis";
export type ButtonSize = "sm" | "md" | "lg";

const TEXT_COLORS: Record<ButtonVariant, TextColor> = {
  primary: "textOnPrimary",
  secondary: "textStrong",
  soft: "textAccent",
  ghost: "textBody",
  crisis: "textOnCrisis",
};
/* iOS: subheadline / body / body semibold; Android: bodyMedium / labelLarge / titleMedium */
const TEXT_VARIANTS: Record<ButtonSize, TextVariant> = {
  sm: "subheadline",
  md: "label",
  lg: "headline",
};

interface Props {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  /** The explanation of the disabled state under the button (HIG Feedback: say why the
      action is not possible). */
  hint?: string;
  /** An action in progress: an indicator + an optional replacement label. */
  loading?: boolean;
  loadingLabel?: string;
  onPress?: (e: GestureResponderEvent) => void;
  href?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  hint,
  loading = false,
  loadingLabel,
  onPress,
  href,
  accessibilityLabel,
  accessibilityHint,
  style,
  textStyle,
}: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const inactive = disabled || loading;

  const handlePress = (e: GestureResponderEvent) => {
    if (inactive) return;
    if (onPress) onPress(e);
    /* Without a dialer or a handler (tablet, web) an unhandled rejection must not occur.
       The number is always visible in the button label, so the user can dial it by hand. */
    if (href) Linking.openURL(href).catch(() => {});
  };

  const textColor: TextColor = disabled ? "textOnSunken" : TEXT_COLORS[variant];

  /* The string children go into `<Text>`; adjacent strings merge into one node, so that the
     gap of 8 does not tear them apart. Outer spaces (JSX around icons) are cut off: the web
     collapsed them; the gap makes the space between the icon and the text. Elements (`Icon`)
     stay as they are: the caller passes them the color explicitly. */
  const content: React.ReactNode[] = [];
  let run = "";
  const flush = () => {
    const piece = run.trim();
    run = "";
    if (piece) {
      content.push(
        <Text
          key={`text-${content.length}`}
          variant={TEXT_VARIANTS[size] || TEXT_VARIANTS.md}
          weight="semibold"
          color={textColor}
          maxFontSizeMultiplier={2}
          style={[styles.text, textStyle]}
        >
          {piece}
        </Text>,
      );
    }
  };
  const source = loading && loadingLabel ? [loadingLabel] : React.Children.toArray(children);
  source.forEach((child) => {
    if (typeof child === "string" || typeof child === "number") {
      run += child;
    } else {
      flush();
      content.push(child);
    }
  });
  flush();

  const button = (
    <Pressable
      accessibilityRole={href ? "link" : "button"}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      onPress={handlePress}
      {...pressFeedback(theme)}
      style={({ pressed }) => [
        styles.base,
        styles[variant] || styles.primary,
        styles[size] || styles.md,
        fullWidth && styles.full,
        disabled && styles.disabled,
        style,
        !inactive && pressedStyle(theme, pressed),
      ]}
    >
      {loading ? (
        /* Decorative: the button has the busy state and the label (aria-hidden covers web too). */
        <ActivityIndicator size="small" color={theme.colors[textColor]} aria-hidden />
      ) : null}
      {content}
    </Pressable>
  );
  if (!hint) return button;
  return (
    <View style={[styles.wrap, fullWidth && styles.full]}>
      {button}
      {disabled ? (
        <Text variant="footnote" color="textMuted" align="center">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  wrap: { flexDirection: "column", gap: 8, alignSelf: "flex-start" },
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: t.radius.pill,
    borderWidth: 1.5,
    borderColor: "transparent",
    overflow: "hidden",
  },

  /* variants */
  primary: { backgroundColor: t.colors.surfacePrimary },
  secondary: { backgroundColor: t.colors.surfaceCard, borderColor: t.colors.borderStrong },
  soft: { backgroundColor: t.colors.accentSoft },
  ghost: { backgroundColor: "transparent" },
  crisis: { backgroundColor: t.colors.surfaceCrisis },

  /* sizes: also `sm` keeps the touch target ≥ 44/48 pt (HIG / Android) */
  sm: { paddingVertical: 7, paddingHorizontal: 14, minHeight: t.platform.minTouch },
  md: { paddingVertical: 10, paddingHorizontal: 20, minHeight: t.platform.minTouch },
  lg: { paddingVertical: 14, paddingHorizontal: 28, minHeight: 52 },

  full: { width: "100%", alignSelf: "stretch" },
  /* disabled: an outline + ink on the sunken surface, not opacity */
  disabled: { backgroundColor: t.colors.surfaceSunken, borderColor: t.colors.borderStrong },

  /* the text can wrap (Dynamic Type), the button grows in height */
  text: { flexShrink: 1, textAlign: "center" },
}));
