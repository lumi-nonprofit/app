/* LumiHeader — obsahový nadpis (kicker + display titulek), SectionLabel —
   mikropopisek sekce. Oba jsou pro čtečku nadpisy (VoiceOver rotor / TalkBack
   navigace po nadpisech). Titulek obrazovky samotné nese nativní hlavička. */
import React from "react";
import { Text, View } from "react-native";
import { createThemedStyles, font, leading, tracking, type } from "../theme";

interface LumiHeaderProps {
  kicker?: string;
  title: string;
  trailing?: React.ReactNode;
}

export function LumiHeader({ kicker, title, trailing }: LumiHeaderProps) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <View style={styles.titleColumn}>
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
  const styles = useStyles();
  return (
    <Text accessibilityRole="header" style={[styles.kicker, styles.sectionLabel]}>
      {children}
    </Text>
  );
}

const useStyles = createThemedStyles((t) => ({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 6,
    paddingHorizontal: 4,
    paddingBottom: 2,
  },
  titleColumn: { flexShrink: 1 },
  kicker: {
    ...font.body(600),
    fontSize: type.xxs,
    letterSpacing: tracking.label(type.xxs),
    textTransform: "uppercase",
    color: t.colors.textOnSunken,
    marginBottom: 4,
  },
  /* titulek obrazovky: xl — hero na onboardingu zůstává xxl, hlavičky tabů o stupeň níž */
  title: {
    ...font.display(700),
    fontSize: type.xl,
    letterSpacing: tracking.display(type.xl),
    color: t.colors.textStrong,
    lineHeight: leading.tight(type.xl),
  },
  sectionLabel: { paddingTop: 4, paddingHorizontal: 4, paddingBottom: 0 },
}));
