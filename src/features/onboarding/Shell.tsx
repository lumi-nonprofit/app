/* Onboarding — sdílený obal kroků (tečky průběhu, zpět) a titulek, bez tab baru. */
import React from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "../../ds/index";
import { palette, colors, radius, font, leading, tracking, type } from "../../theme";

interface ObShellProps {
  step: number;
  onBack?: () => void;
  children: React.ReactNode;
}

export function ObShell({ step, onBack, children }: ObShellProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.top, { paddingTop: insets.top + 24 }]}>
          {onBack ? (
            <IconButton icon="arrow-left" label="Zpět" onPress={onBack} />
          ) : (
            <View style={styles.topSpacer} />
          )}
          <View
            style={styles.dots}
            accessibilityLabel={`Krok ${step} ze 3`}
            accessibilityHint="Průběh úvodního nastavení."
          >
            {[1, 2, 3].map((i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>
          <View style={styles.topSpacer} />
        </View>
        <View style={[styles.body, { paddingBottom: insets.bottom + 40 }]}>{children}</View>
      </KeyboardAvoidingView>
    </View>
  );
}

interface ObTitleProps {
  title: string;
  body?: string;
}

export function ObTitle({ title, body }: ObTitleProps) {
  return (
    <View style={styles.titleWrap}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {body ? <Text style={styles.titleBody}>{body}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  /* .ob-screen */
  screen: { flex: 1, backgroundColor: colors.surfacePage },
  /* .ob-top — paddingTop doplňuje insets.top + 24 inline */
  top: {
    paddingHorizontal: 24,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topSpacer: { width: 44 },
  dots: { flexDirection: "row", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: palette.cream200 },
  dotActive: { width: 22, backgroundColor: palette.sun500 },
  /* .ob-body — paddingBottom doplňuje insets.bottom + 40 inline */
  body: { flex: 1, paddingTop: 18, paddingHorizontal: 24 },

  titleWrap: { marginBottom: 24 },
  title: {
    marginBottom: 10,
    ...font.display(700),
    fontSize: type.xxl,
    letterSpacing: tracking.display(type.xxl),
    color: colors.textStrong,
    lineHeight: leading.tight(type.xxl),
  },
  titleBody: {
    ...font.body(400),
    fontSize: type.base,
    lineHeight: leading.body(type.base),
    color: colors.textBody,
  },
});
