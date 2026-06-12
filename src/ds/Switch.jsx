/* Switch — přepínač nastavení; krémová dráha se zapnutím zbarví do zlata.
   Kanonický prvek pro volby kolem soukromí. */
import { StyleSheet, Switch as RNSwitch, Text, View } from "react-native";
import { colors, palette, font, type } from "../theme.js";

export default function Switch({ checked = false, onChange, label, style }) {
  return (
    <View style={[styles.row, style]}>
      <RNSwitch
        value={checked}
        onValueChange={(v) => onChange && onChange(v)}
        trackColor={{ false: palette.cream200, true: palette.sun500 }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={palette.cream200}
        accessibilityLabel={label}
      />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  label: { ...font.body(400), fontSize: type.base, color: colors.textBody },
});
