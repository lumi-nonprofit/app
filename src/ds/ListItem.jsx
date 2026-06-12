/* ListItem — klepnutelný řádek: tónovaná dlaždice s ikonou + titulek/podtitulek + šipka.
   Doplněk nad rámec DS: `href` otevírá odkaz přes Linking (tel: na krizové linky). */
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import Icon from "./Icon.jsx";
import { colors, palette, radius, font, type } from "../theme.js";

export default function ListItem({
  icon,
  iconTint = colors.accentSoft,
  iconColor = palette.sun700,
  title,
  subtitle,
  trailing,
  chevron = true,
  onPress,
  href,
  style,
}) {
  const handlePress = () => {
    if (onPress) onPress();
    if (href) Linking.openURL(href);
  };
  return (
    <Pressable
      accessibilityRole={href ? "link" : "button"}
      onPress={handlePress}
      style={({ pressed }) => [styles.row, pressed && { transform: [{ scale: 0.995 }] }, style]}
    >
      {icon ? (
        <View style={[styles.leading, { backgroundColor: iconTint }]}>
          <Icon name={icon} size={20} color={iconColor} />
        </View>
      ) : null}
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
      <View style={styles.trailing}>
        {trailing}
        {chevron ? <Icon name="chevron-right" size={18} color={colors.textFaint} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    minHeight: 56,
  },
  leading: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, minWidth: 0 },
  title: { ...font.body(600), fontSize: type.base, color: colors.textStrong },
  sub: { ...font.body(400), fontSize: type.sm, color: colors.textMuted, marginTop: 1 },
  trailing: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 },
});
