/* Switch: a settings toggle in a list row. HIG Toggles: a switch only in a row, the row
   gives the context; Android: the label on the left, the switch on the right. The whole
   row is tappable; `accessibilityState` carries the state, not the label text. The "on"
   color = accentFill (≥ 3:1), off = the platform default. */
import { Pressable, Switch as RNSwitch, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { createThemedStyles, useTheme } from "../theme";
import Text from "./Text";

interface Props {
  checked?: boolean;
  onChange?: (value: boolean) => void;
  label?: string;
  /** A supplementary description under the label (Android settings pattern: secondary text). */
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
      /* an explicitly accessible element: screen readers and tests (RNTL) see it as a
         "switch" also on Android */
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
