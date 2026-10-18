/* Switch — přepínač nastavení v řádku seznamu (HIG Toggles: switch jen v řádku,
   kontext dává řádek; Android: label vlevo, přepínač vpravo). Celý řádek je
   klepnutelný; stav nese accessibilityState, ne text labelu. Barva „zapnuto“
   = accentFill (≥ 3:1), vypnuto = platformní výchozí. */
import { Pressable, Switch as RNSwitch, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { createThemedStyles, useTheme } from "../theme";
import Text from "./Text";

interface Props {
  checked?: boolean;
  onChange?: (value: boolean) => void;
  label?: string;
  /** Doplňující popis pod labelem (Android settings pattern: supporting text). */
  description?: string;
  accessibilityHint?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function Switch({
  checked = false,
  onChange,
  label,
  description,
  accessibilityHint,
  disabled = false,
  style,
}: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const toggle = () => {
    if (!disabled && onChange) onChange(!checked);
  };
  const control = (
    <RNSwitch
      /* explicitně přístupný prvek: čtečky i testy (RNTL) ho berou jako „switch“ i na Androidu */
      accessible
      accessibilityState={{ checked, disabled }}
      value={checked}
      disabled={disabled}
      onValueChange={(v) => onChange && onChange(v)}
      trackColor={{ true: theme.colors.accentFill }}
      thumbColor={theme.platform.isAndroid ? theme.colors.surfaceCard : undefined}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
    />
  );
  if (!label) return <View style={[styles.row, style]}>{control}</View>;
  return (
    <Pressable accessible={false} onPress={toggle} style={[styles.row, style]}>
      <View style={styles.text} importantForAccessibility="no-hide-descendants">
        <Text variant="body" color="textStrong">
          {label}
        </Text>
        {description ? (
          <Text variant="subheadline" color="textMuted">
            {description}
          </Text>
        ) : null}
      </View>
      {control}
    </Pressable>
  );
}

const useStyles = createThemedStyles((t) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: t.platform.minTouch,
  },
  text: { flex: 1, minWidth: 0, gap: 2 },
}));
