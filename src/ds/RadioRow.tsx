/* RadioRow — jedna volba výběru (věkové pásmo, rytmus dechu): karta s terčíkem.
   Vybraný stav nese tvar (vyplněný terčík) + obrys selectionBorder (≥ 3:1)
   + accessibilityState, nikdy jen barva. Řádek ≥ 56 dp / 44 pt, ripple či
   opacita podle platformy, jemná haptika při výběru. */
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
      accessibilityHint={accessibilityHint}
      /* jméno čte čtečka z textu volby — žádný duplicitní label */
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
