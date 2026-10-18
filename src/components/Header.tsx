/* LumiHeader: the content heading (kicker + title in title2, one step below the large title of
   the native header that the navigator draws). SectionLabel: the small label of a section. Both
   are headings for the screen reader (VoiceOver rotor, TalkBack navigation by headings). */
import React from "react";
import { View } from "react-native";
import { Text } from "../ds";
import { createThemedStyles } from "../theme";

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
        {kicker ? (
          <Text variant="kicker" style={styles.kicker}>
            {kicker}
          </Text>
        ) : null}
        <Text accessibilityRole="header" variant="title2">
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
    <Text accessibilityRole="header" variant="kicker" style={styles.sectionLabel}>
      {children}
    </Text>
  );
}

const useStyles = createThemedStyles(() => ({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    paddingTop: 6,
    paddingHorizontal: 4,
    paddingBottom: 2,
  },
  titleColumn: { flexShrink: 1, flexGrow: 1 },
  kicker: { marginBottom: 4 },
  sectionLabel: { paddingTop: 4, paddingHorizontal: 4, paddingBottom: 0 },
}));
