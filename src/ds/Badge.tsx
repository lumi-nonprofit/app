/* Badge — malý stavový pill pro metadata (5 MIN, VEČER); jemné tóny, nikdy syté výplně. */
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { colors, font, leading, palette, radius, type } from "../theme";

type BadgeTone = "neutral" | "accent" | "positive" | "info" | "danger" | "lilac";

interface ToneStyle {
  backgroundColor: string;
  color: string;
}

const TONES: Record<BadgeTone, ToneStyle> = {
  neutral: { backgroundColor: colors.surfaceSunken, color: colors.textMuted },
  accent: { backgroundColor: colors.accentSoft, color: palette.sun700 },
  positive: { backgroundColor: colors.positiveSoft, color: palette.sage700 },
  info: { backgroundColor: colors.infoSoft, color: palette.lake700 },
  danger: { backgroundColor: colors.dangerSoft, color: palette.clay700 },
  lilac: { backgroundColor: palette.lilac100, color: palette.lilac700 },
};

interface Props {
  children: React.ReactNode;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
}

export default function Badge({ children, tone = "neutral", style }: Props) {
  const t = TONES[tone] || TONES.neutral;
  return (
    <View style={[styles.badge, { backgroundColor: t.backgroundColor }, style]}>
      {React.Children.map(children, (child) =>
        typeof child === "string" || typeof child === "number" ? (
          <Text style={[styles.text, { color: t.color }]}>{child}</Text>
        ) : (
          child
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
  },
  text: {
    ...font.body(600),
    fontSize: type.xs,
    lineHeight: leading.body(type.xs),
    letterSpacing: 0.02 * type.xs,
  },
});
