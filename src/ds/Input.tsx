/* Input — textové pole (nebo textarea přes `multiline`): zapuštěná plocha,
   viditelný label + hint, focus ring (≥ 3:1) a chybový stav s textem u pole
   (HIG Text fields / Writing: chybu ukázat hned u pole, říct co s tím). */
import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import type { StyleProp, TextInputProps, ViewStyle } from "react-native";
import { createThemedStyles, font, leading, type, useTheme } from "../theme";

/* `style` patří obalujícímu View, ne TextInputu — proto Omit. */
interface Props extends Omit<TextInputProps, "style"> {
  label?: string;
  hint?: string;
  /** Chybová hláška: bez výčitek, s řešením („Použij jen písmena.“). */
  error?: string;
  multiline?: boolean;
  rows?: number;
  style?: StyleProp<ViewStyle>;
}

export default function Input({
  label,
  hint,
  error,
  multiline = false,
  rows = 4,
  style,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={[styles.field, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          focused && styles.inputFocused,
          !!error && styles.inputError,
        ]}
        multiline={multiline}
        numberOfLines={multiline ? rows : undefined}
        placeholderTextColor={theme.colors.textOnSunken}
        selectionColor={theme.colors.accentFill}
        clearButtonMode={multiline ? "never" : "while-editing"}
        accessibilityLabel={label}
        accessibilityHint={hint}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  field: { flexDirection: "column", gap: 6 },
  label: { ...font.body(600), fontSize: type.sm, color: t.colors.textBody },
  hint: {
    ...font.body(400),
    fontSize: type.xs,
    lineHeight: leading.body(type.xs),
    color: t.colors.textMuted,
  },
  error: {
    ...font.body(500),
    fontSize: type.xs,
    lineHeight: leading.body(type.xs),
    color: t.colors.textDanger,
  },
  input: {
    ...font.body(400),
    fontSize: type.base,
    color: t.colors.textStrong,
    backgroundColor: t.colors.surfaceSunken,
    borderWidth: 1.5,
    borderColor: "transparent",
    borderRadius: t.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: t.platform.minTouch,
    width: "100%",
  },
  inputFocused: { borderColor: t.colors.focusRing },
  inputError: { borderColor: t.colors.textDanger },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: "top",
    lineHeight: leading.body(type.base),
  },
  hairline: { height: StyleSheet.hairlineWidth },
}));
