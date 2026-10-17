/* Badge — malý stavový pill pro metadata (5 MIN, VEČER); jemné tóny, nikdy syté výplně.
   Text v tónu odstínu drží ≥ 4,5:1 na své měkké výplni (viz contrastPairs). */
import React from "react";
import { Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { createThemedStyles, font, leading, type, useTheme } from "../theme";

export type BadgeTone = "neutral" | "accent" | "positive" | "info" | "danger" | "lilac";

interface Props {
  children: React.ReactNode;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
}

export default function Badge({ children, tone = "neutral", style }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const c = theme.colors;
  const t = {
    neutral: { backgroundColor: c.surfaceSunken, color: c.textOnSunken },
    accent: { backgroundColor: c.accentSoft, color: c.textAccent },
    positive: { backgroundColor: c.positiveSoft, color: c.textPositive },
    info: { backgroundColor: c.infoSoft, color: c.textInfo },
    danger: { backgroundColor: c.dangerSoft, color: c.textDanger },
    lilac: { backgroundColor: c.lilacSoft, color: c.textLilac },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.backgroundColor }, style]}>
      {React.Children.map(children, (child) =>
        typeof child === "string" || typeof child === "number" ? (
          <Text style={[styles.text, { color: t.color }]} maxFontSizeMultiplier={1.5}>
            {child}
          </Text>
        ) : (
          child
        ),
      )}
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: t.radius.pill,
  },
  text: {
    ...font.body(600),
    fontSize: type.xs,
    lineHeight: leading.body(type.xs),
    letterSpacing: 0.02 * type.xs,
  },
}));
