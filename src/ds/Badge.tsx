/* Badge — malý stavový pill pro metadata (5 MIN, VEČER); jemné tóny, nikdy syté výplně.
   Text v tónu odstínu drží ≥ 4,5:1 na své měkké výplni (viz contrastPairs). */
import React from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { createThemedStyles, useTheme } from "../theme";
import Text from "./Text";
import { toneColors, type Tone } from "./tone";

export type BadgeTone = Tone;

interface Props {
  children: React.ReactNode;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
}

export default function Badge({ children, tone = "neutral", style }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const t = toneColors(theme, tone);
  return (
    <View style={[styles.badge, { backgroundColor: t.soft }, style]}>
      {React.Children.map(children, (child) =>
        typeof child === "string" || typeof child === "number" ? (
          <Text
            variant="caption1"
            weight="semibold"
            color={t.textRole}
            maxFontSizeMultiplier={1.5}
            style={styles.text}
          >
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
  text: { letterSpacing: 0.24 },
}));
