/* Onboarding — sdílený obal kroků (tečky průběhu, zpět) a titulek, bez tab baru.
   Obsah scrolluje (Dynamic Type 200 %, malé displeje, klávesnice) — CTA se
   nikdy neocitne mimo obrazovku. */
import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton, Text } from "../../ds";
import { createThemedStyles } from "../../theme";

interface ObShellProps {
  step: number;
  onBack?: () => void;
  children: React.ReactNode;
}

export function ObShell({ step, onBack, children }: ObShellProps) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
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
        <ScrollView
          style={styles.flex1}
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

interface ObTitleProps {
  title: string;
  body?: string;
}

export function ObTitle({ title, body }: ObTitleProps) {
  const styles = useStyles();
  return (
    <View style={styles.titleWrap}>
      <Text accessibilityRole="header" variant="largeTitle" style={styles.title}>
        {title}
      </Text>
      {body ? <Text variant="body">{body}</Text> : null}
    </View>
  );
}

const useStyles = createThemedStyles((t) => ({
  flex1: { flex: 1 },
  screen: { flex: 1, backgroundColor: t.colors.surfacePage },
  /* paddingTop doplňuje insets.top + 24 inline */
  top: {
    paddingHorizontal: 24,
    minHeight: t.platform.minTouch,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topSpacer: { width: t.platform.minTouch },
  dots: { flexDirection: "row", gap: 6 },
  /* průběh: neaktivní tečka ≥ 3:1 (borderStrong), aktivní protáhlá + accentFill */
  dot: { width: 8, height: 8, borderRadius: t.radius.pill, backgroundColor: t.colors.borderStrong },
  dotActive: { width: 22, backgroundColor: t.colors.accentFill },
  /* paddingBottom doplňuje insets.bottom + 40 inline */
  body: { flexGrow: 1, paddingTop: 18, paddingHorizontal: 24 },

  titleWrap: { marginBottom: 24 },
  title: { marginBottom: 10 },
}));
