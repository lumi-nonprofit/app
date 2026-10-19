/* Input: a text field (or a textarea through `multiline`). It has a sunken surface, a visible
   label + hint, a focus ring (≥ 3:1) and an error state with text next to the field.
   HIG Text fields and the HIG guidance on text: show the error next to the field, say what to do.
   The font of the field = the body variant (it scales with Dynamic Type, the height grows). */
import React from "react";
import { TextInput, View } from "react-native";
import type { StyleProp, TextInputProps, ViewStyle } from "react-native";
import { createThemedStyles, useTheme } from "../theme";
import Text, { textStyle } from "./Text";

/* `style` belongs to the outer `View`, not to the `TextInput`: thus `Omit`. */
interface Props extends Omit<TextInputProps, "style"> {
  label?: string;
  hint?: string;
  /** The error message: no reproach, with a solution ("Použij jen písmena."). */
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
      {label ? (
        <Text variant="subheadline" weight="semibold" color="textBody">
          {label}
        </Text>
      ) : null}
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
        <Text accessibilityRole="alert" variant="footnote" weight="medium" color="textDanger">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="footnote" color="textMuted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  field: { flexDirection: "column", gap: 6 },
  input: {
    ...textStyle("body"),
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
  inputMultiline: { minHeight: 96, textAlignVertical: "top" },
}));
