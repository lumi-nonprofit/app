/* Switch — přepínač nastavení; krémová dráha se zapnutím zbarví do zlata.
   Kanonický prvek pro volby kolem soukromí. */
import { StyleSheet, Switch as RNSwitch, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { colors, palette, font, type } from "../theme";

interface Props {
  checked?: boolean;
  onChange?: (value: boolean) => void;
  label?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

export default function Switch({
  checked = false,
  onChange,
  label,
  accessibilityHint,
  style,
}: Props) {
  return (
    <View style={[styles.row, style]}>
      <RNSwitch
        value={checked}
        onValueChange={(v) => onChange && onChange(v)}
        trackColor={{ false: palette.cream200, true: palette.sun500 }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={palette.cream200}
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
      />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  label: { ...font.body(400), fontSize: type.base, color: colors.textBody },
});
