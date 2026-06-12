/* LumiHeader — hlavička obrazovky (kicker + display titulek), SectionLabel — mikropopisek sekce. */
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { palette, colors, font, leading, tracking } from "../theme";

interface LumiHeaderProps {
  kicker?: string;
  title: string;
  trailing?: React.ReactNode;
}

export function LumiHeader({ kicker, title, trailing }: LumiHeaderProps) {
  return (
    <View style={styles.row}>
      <View>
        {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
      </View>
      {trailing || null}
    </View>
  );
}

interface SectionLabelProps {
  children: React.ReactNode;
}

export function SectionLabel({ children }: SectionLabelProps) {
  return <Text style={[styles.kicker, styles.sectionLabel]}>{children}</Text>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingTop: 6,
    paddingHorizontal: 4,
    paddingBottom: 2,
  },
  /* .lumi-kicker z app.css */
  kicker: {
    ...font.body(600),
    fontSize: 11,
    letterSpacing: tracking.label(11),
    textTransform: "uppercase",
    color: palette.ink700,
    marginBottom: 4,
  },
  title: {
    ...font.display(700),
    fontSize: 27,
    letterSpacing: tracking.display(27),
    color: colors.textStrong,
    lineHeight: leading.tight(27),
  },
  sectionLabel: { paddingTop: 4, paddingHorizontal: 4, paddingBottom: 0 },
});
