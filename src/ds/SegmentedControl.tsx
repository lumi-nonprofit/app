/* SegmentedControl — přepínač úzce souvisejících pohledů (HIG: segmented
   control, podstatná jména, ≤ 5 segmentů). iOS: nativní UISegmentedControl;
   Android a web: Material 3 segmented buttons (obrysová skupina, vybraný
   segment = měkká výplň + fajfka, 48 dp, ripple), role radiogroup/radio. */
import React from "react";
import { Pressable, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import RNSegmentedControl from "@react-native-segmented-control/segmented-control";
import { createThemedStyles, useTheme } from "../theme";
import Icon from "./Icon";
import { pressFeedback, pressedStyle } from "./press";
import Text from "./Text";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  accessibilityHint,
  style,
}: Props<T>) {
  const theme = useTheme();
  const styles = useStyles();
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  if (theme.platform.isIOS) {
    return (
      <RNSegmentedControl
        values={options.map((o) => o.label)}
        selectedIndex={selectedIndex}
        onChange={(e) => {
          const next = options[e.nativeEvent.selectedSegmentIndex];
          if (next) onChange(next.value);
        }}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        fontStyle={{ color: theme.colors.textBody }}
        activeFontStyle={{ color: theme.colors.textStrong, fontWeight: "600" }}
        style={style}
      />
    );
  }

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={[styles.group, style]}
    >
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(o.value)}
            {...pressFeedback(theme)}
            style={({ pressed }) => [
              styles.segment,
              i === 0 && styles.first,
              i === options.length - 1 && styles.last,
              i > 0 && styles.divider,
              selected && styles.selected,
              pressedStyle(theme, pressed),
            ]}
          >
            {selected ? (
              <Icon name="check" size={16} weight="semibold" color={theme.colors.textAccent} />
            ) : null}
            <Text
              variant="subheadline"
              weight="medium"
              color={selected ? "textAccent" : "textBody"}
              maxFontSizeMultiplier={1.6}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  group: {
    flexDirection: "row",
    alignSelf: "flex-start",
    borderRadius: t.radius.pill,
    borderWidth: 1,
    borderColor: t.colors.borderStrong,
    overflow: "hidden",
  },
  segment: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: t.platform.minTouch,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: t.colors.surfaceCard,
  },
  first: { borderTopLeftRadius: t.radius.pill, borderBottomLeftRadius: t.radius.pill },
  last: { borderTopRightRadius: t.radius.pill, borderBottomRightRadius: t.radius.pill },
  divider: { borderLeftWidth: 1, borderLeftColor: t.colors.borderStrong },
  selected: { backgroundColor: t.colors.accentSoft },
}));
