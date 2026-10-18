/* Button — pill tlačítko pro všechny akce Lumi.
   primary = plný ink (zlatá jako výplň neprojde kontrastem), crisis = clay700
   (bílý text 6,5:1; v dark clay300 + inkoust), soft = zlatý wash s textem sun700.
   Disabled = obrys + inkoustový text na zapuštěném podkladu, NIKDY snížená opacita
   (README, ADR 0001 §11); volitelný `hint` pod tlačítkem říká, co chybí.
   Press state: Android ripple, iOS opacita (HIG Buttons). `loading` ukáže
   indikátor a volitelný náhradní label („Ukládám…“). `href` otevírá odkaz přes
   Linking se stejným vzhledem (tel: linky) a rolí link. Popisek škáluje
   s Dynamic Type do 2× (HIG: text tlačítka neořezávat, výška roste). */
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
  /** Vysvětlení disabled stavu pod tlačítkem (HIG Feedback: říct, proč nelze). */
  hint?: string;
  /** Probíhající akce: indikátor + volitelný náhradní label. */
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
    /* bez dialeru/handleru (tablet, web) nesmí spadnout unhandled rejection —
       číslo je vždy viditelné v popisku tlačítka, dá se vytočit ručně */
    if (href) Linking.openURL(href).catch(() => {});
  };

  const textColor: TextColor = disabled ? "textOnSunken" : TEXT_COLORS[variant];

  /* Stringové děti obalíme do <Text>; sousední texty slučujeme do jednoho uzlu,
     aby je gap 8 neroztrhal. Krajní mezery (JSX kolem ikon) odřezáváme — web je
     kolaboval; mezeru mezi ikonou a textem dělá gap. Elementy (Icon) zůstávají
     beze změny — barvu jim předává volající explicitně. */
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
      {loading ? <ActivityIndicator size="small" color={theme.colors[textColor]} /> : null}
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

  /* varianty */
  primary: { backgroundColor: t.colors.surfacePrimary },
  secondary: { backgroundColor: t.colors.surfaceCard, borderColor: t.colors.borderStrong },
  soft: { backgroundColor: t.colors.accentSoft },
  ghost: { backgroundColor: "transparent" },
  crisis: { backgroundColor: t.colors.surfaceCrisis },

  /* velikosti — i sm drží dotykový cíl ≥ 44/48 pt (HIG / Android) */
  sm: { paddingVertical: 7, paddingHorizontal: 14, minHeight: t.platform.minTouch },
  md: { paddingVertical: 10, paddingHorizontal: 20, minHeight: t.platform.minTouch },
  lg: { paddingVertical: 14, paddingHorizontal: 28, minHeight: 52 },

  full: { width: "100%", alignSelf: "stretch" },
  /* disabled: obrys + inkoust na zapuštěném podkladu, ne opacita */
  disabled: { backgroundColor: t.colors.surfaceSunken, borderColor: t.colors.borderStrong },

  /* text se smí zalomit (Dynamic Type), tlačítko roste do výšky */
  text: { flexShrink: 1, textAlign: "center" },
}));
