/* RadioRow: one option of a choice (age band, breath rhythm): a card with a radio dot.
   The shape (a filled dot) + the selectionBorder outline (≥ 3:1) + `accessibilityState`
   carry the selected state, never only a color. The row is ≥ 56 dp / 44 pt, ripple or
   opacity follows the platform, a gentle haptic on selection. */
import { Pressable, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { haptics } from "../lib/haptics";
import { createThemedStyles, useTheme } from "../theme";
import { pressFeedback, pressedStyle } from "./press";
import Text from "./Text";

interface Props {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

export default function RadioRow({
  label,
  description,
  selected,
  onPress,
  accessibilityHint,
  style,
}: Props) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      accessibilityHint={accessibilityHint}
      /* the screen reader reads the name from the option text: no duplicate label */
      onPress={() => {
        haptics.select();
        onPress();
      }}
      {...pressFeedback(theme)}
      style={({ pressed }) => [
        styles.row,
        selected && styles.rowSelected,
        style,
        pressedStyle(theme, pressed),
      ]}
    >
      <View style={[styles.dot, selected && styles.dotSelected]} accessible={false}>
        {selected ? <View style={styles.dotInner} /> : null}
      </View>
      <View style={styles.text}>
        <Text variant="body" weight="semibold" color="textStrong">
          {label}
        </Text>
        {description ? (
          <Text variant="footnote" color="textMuted" style={styles.description}>
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const useStyles = createThemedStyles((t) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: t.platform.listRowMinHeight,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: t.colors.surfaceCard,
    borderRadius: t.radius.md,
    borderWidth: 1.5,
    borderColor: t.scheme === "dark" ? t.colors.borderSubtle : "transparent",
    overflow: "hidden",
    ...t.elevation.card,
  },
  rowSelected: { borderColor: t.colors.selectionBorder },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: t.colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  dotSelected: { borderColor: t.colors.accentFill },
  dotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: t.colors.accentFill },
  text: { flex: 1, minWidth: 0 },
  description: { marginTop: 2 },
}));
