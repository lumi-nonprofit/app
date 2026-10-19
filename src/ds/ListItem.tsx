/* ListItem: a tappable row: a toned tile with an icon + a title and a subtitle.
   iOS: a disclosure chevron for the drill-down (HIG Lists); Android: without an indicator
   (Android guides: lists without chevrons and dividers), ripple. `href` opens the link
   through `Linking` (tel: to the crisis lines): the row is a link with a phone icon.
   `tone` gives the color of the tile (a soft fill + a strong shade, works in both modes). */
import type { ComponentProps, ReactNode } from "react";
import { Linking, Pressable, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import Icon from "./Icon";
import { createThemedStyles, useTheme } from "../theme";
import { pressFeedback, pressedStyle } from "./press";
import Text from "./Text";
import { toneColors, type Tone } from "./tone";

interface Props {
  /* the icon name derived from `Icon`: it stays in sync with its set */
  icon?: ComponentProps<typeof Icon>["name"];
  /** The tone of the icon tile; the default is accent. */
  tone?: Tone;
  /** A manual override of the tile colors (exceptional; usually `tone` is enough). */
  iconTint?: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  /** The disclosure indicator; the default follows the platform (iOS yes, Android no). */
  chevron?: boolean;
  onPress?: () => void;
  href?: string;
  /** The item is not available yet ("in preparation"): no chevron, no action, and a state for
      the screen reader. */
  disabled?: boolean;
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
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  style,
}: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const toneColor = toneColors(theme, tone);
  const showChevron = chevron ?? (theme.platform.isIOS && !href && !disabled);
  const handlePress = () => {
    if (disabled) return;
    if (onPress) onPress();
    if (href) Linking.openURL(href).catch(() => {});
  };
  return (
    <Pressable
      accessibilityRole={href ? "link" : "button"}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      onPress={handlePress}
      {...(disabled ? {} : pressFeedback(theme))}
      style={({ pressed }) => [styles.row, !disabled && pressedStyle(theme, pressed), style]}
    >
      {icon ? (
        <View style={[styles.leading, { backgroundColor: iconTint ?? toneColor.soft }]}>
          <Icon name={icon} size={20} color={iconColor ?? toneColor.text} />
        </View>
      ) : null}
      <View style={styles.body}>
        <Text variant="body" weight="semibold" color={disabled ? "textMuted" : "textStrong"}>
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
