/* LumiHeader — hlavička obrazovky (kicker + display titulek), SectionLabel — mikropopisek sekce. */
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { palette, colors, font, leading, tracking, type } from "../theme";

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
    fontSize: type.xxs,
    letterSpacing: tracking.label(type.xxs),
    textTransform: "uppercase",
    color: palette.ink700,
    marginBottom: 4,
  },
  /* titulek obrazovky: xl — hero na onboardingu zůstává xxl, hlavičky tabů o stupeň níž */
  title: {
    ...font.display(700),
    fontSize: type.xl,
    letterSpacing: tracking.display(type.xl),
    color: colors.textStrong,
    lineHeight: leading.tight(type.xl),
  },
  sectionLabel: { paddingTop: 4, paddingHorizontal: 4, paddingBottom: 0 },
});
