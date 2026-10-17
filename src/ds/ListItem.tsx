/* ListItem — klepnutelný řádek: tónovaná dlaždice s ikonou + titulek/podtitulek.
   iOS: disclosure chevron pro drill-down (HIG Lists); Android: bez indikátoru
   (Android guides: listy bez chevronů a dividerů), ripple. `href` otevírá odkaz
   přes Linking (tel: na krizové linky) — řádek je link s ikonou telefonu.
   Barvu dlaždice dává `tone` (měkká výplň + silný odstín, funguje v obou režimech). */
import type { ComponentProps, ReactNode } from "react";
import { Linking, Pressable, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import Icon from "./Icon";
import { createThemedStyles, useTheme } from "../theme";
import { pressFeedback, pressedStyle } from "./press";
import Text from "./Text";
import { toneColors, type Tone } from "./tone";

interface Props {
  /* název ikony odvozený z Icon — drží se v synchronu s jeho sadou */
  icon?: ComponentProps<typeof Icon>["name"];
  /** Tón dlaždice ikony; výchozí accent. */
  tone?: Tone;
  /** Ruční přepis barev dlaždice (výjimečně; běžně stačí `tone`). */
  iconTint?: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  /** Disclosure indikátor; výchozí podle platformy (iOS ano, Android ne). */
  chevron?: boolean;
  onPress?: () => void;
  href?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

export default function ListItem({
  icon,
  tone = "accent",
  iconTint,
  iconColor,
  title,
  subtitle,
  trailing,
  chevron,
  onPress,
  href,
  accessibilityLabel,
  accessibilityHint,
  style,
}: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const toneColor = toneColors(theme, tone);
  const showChevron = chevron ?? (theme.platform.isIOS && !href);
  const handlePress = () => {
    if (onPress) onPress();
    if (href) Linking.openURL(href).catch(() => {});
  };
  return (
    <Pressable
      accessibilityRole={href ? "link" : "button"}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={handlePress}
      {...pressFeedback(theme)}
      style={({ pressed }) => [styles.row, pressedStyle(theme, pressed), style]}
    >
      {icon ? (
        <View style={[styles.leading, { backgroundColor: iconTint ?? toneColor.soft }]}>
          <Icon name={icon} size={20} color={iconColor ?? toneColor.text} />
        </View>
      ) : null}
      <View style={styles.body}>
        <Text variant="body" weight="semibold" color="textStrong">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="subheadline" color="textMuted" style={styles.sub}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.trailing}>
        {trailing}
        {href ? <Icon name="phone" size={18} color={theme.colors.textMuted} /> : null}
        {showChevron ? (
          <Icon name="chevron-right" size={18} color={theme.colors.textMuted} />
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
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: t.radius.md,
    minHeight: t.platform.listRowMinHeight,
    overflow: "hidden",
  },
  leading: {
    width: 40,
    height: 40,
    borderRadius: t.radius.sm,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, minWidth: 0 },
  sub: { marginTop: 1 },
  trailing: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 },
}));
