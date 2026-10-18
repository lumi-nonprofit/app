/* The shared shell of the onboarding steps (progress dots, back) and the title, without a tab
   bar. The content scrolls (Dynamic Type 200 %, small displays, the keyboard), so the call to
   action never ends up outside the screen. */
import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, IconButton, Text } from "../../ds";
import { useTranslation } from "../../i18n";
import { createThemedStyles } from "../../theme";

const STEPS = [1, 2, 3] as const;

interface ObShellProps {
  step: number;
  onBack?: () => void;
  children: React.ReactNode;
}

export function ObShell({ step, onBack, children }: ObShellProps) {
  const { t } = useTranslation(["onboarding", "common"]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const styles = useStyles();
  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.top, { paddingTop: insets.top + 24 }]}>
          {onBack ? (
            <IconButton icon="arrow-left" label={t("common:actions.back")} onPress={onBack} />
          ) : (
            <View style={styles.topSpacer} />
          )}
          <View
            style={styles.dots}
            accessibilityLabel={t("shell.progress.a11yLabel", { step, total: STEPS.length })}
            accessibilityHint={t("shell.progress.a11yHint")}
          >
            {STEPS.map((i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>
          <View style={styles.topSpacer} />
        </View>
        <ScrollView
          style={styles.flex1}
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {children}
          {/* The crisis help is available before the end of the onboarding too (HIG Agency: an easy exit). */}
          <View style={styles.crisis}>
            <Button variant="ghost" size="sm" onPress={() => router.push("/crisis")}>
              {t("shell.crisis")}
            </Button>
          </View>
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
  /* The inline style adds insets.top + 24 to paddingTop. */
  top: {
    paddingHorizontal: 24,
    minHeight: t.platform.minTouch,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topSpacer: { width: t.platform.minTouch },
  dots: { flexDirection: "row", gap: 6 },
  /* Progress: an inactive dot has at least 3:1 (borderStrong); the active dot is wider and uses accentFill. */
  dot: { width: 8, height: 8, borderRadius: t.radius.pill, backgroundColor: t.colors.borderStrong },
  dotActive: { width: 22, backgroundColor: t.colors.accentFill },
  /* The inline style adds insets.bottom + 24 to paddingBottom. */
  body: { flexGrow: 1, paddingTop: 18, paddingHorizontal: 24 },

  crisis: { alignItems: "center", marginTop: 12 },

  titleWrap: { marginBottom: 24 },
  title: { marginBottom: 10 },
}));
