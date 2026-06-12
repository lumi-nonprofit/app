/* Input — textové pole (nebo textarea přes `multiline`): zapuštěná krémová plocha. */
import { StyleSheet, Text, TextInput, View } from "react-native";
import type { StyleProp, TextInputProps, ViewStyle } from "react-native";
import { colors, font, leading, radius, type } from "../theme";

/* `style` patří obalujícímu View, ne TextInputu — proto Omit. */
interface Props extends Omit<TextInputProps, "style"> {
  label?: string;
  hint?: string;
  multiline?: boolean;
  rows?: number;
  style?: StyleProp<ViewStyle>;
}

export default function Input({ label, hint, multiline = false, rows = 4, style, ...rest }: Props) {
  return (
    <View style={[styles.field, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        multiline={multiline}
        numberOfLines={multiline ? rows : undefined}
        placeholderTextColor={colors.textFaint}
        accessibilityLabel={label}
        accessibilityHint={hint}
        {...rest}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: "column", gap: 6 },
  label: { ...font.body(600), fontSize: type.sm, color: colors.textBody },
  hint: { ...font.body(400), fontSize: type.xs, color: colors.textFaint },
  input: {
    ...font.body(400),
    fontSize: type.base,
    color: colors.textBody,
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1.5,
    borderColor: "transparent",
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
    width: "100%",
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: "top",
    lineHeight: leading.body(type.base),
  },
});
