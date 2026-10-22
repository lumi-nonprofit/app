/* Step 3 of the onboarding: privacy without legal language; the share option is off by default. */
import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Icon, Text } from "../../ds";
import type { IconName } from "../../ds/Icon";
import { useTranslation } from "../../i18n";
import { useAppStore } from "../../store";
import { createThemedStyles, useTheme } from "../../theme";
import { ObShell, ObTitle } from "./Shell";

export default function PrivacyStep() {
  const { t } = useTranslation(["onboarding", "common"]);
  const { patch } = useAppStore();
  const router = useRouter();
  const theme = useTheme();
  const styles = useStyles();
  const rows: { icon: IconName; text: string }[] = [
    { icon: "smartphone", text: t("privacy.rows.phone") },
    { icon: "flask-conical", text: t("privacy.rows.research") },
    { icon: "toggle-left", text: t("privacy.rows.off") },
  ];
  return (
    <ObShell step={3} onBack={() => router.back()}>
      <View style={styles.shieldBadge}>
        <Icon name="shield" size={26} color={theme.colors.textInfo} />
      </View>
      <ObTitle title={t("privacy.title")} />
      <View style={styles.rowsBox}>
        {rows.map((r, i) => (
          <View key={r.icon} style={[styles.row, i > 0 && styles.rowBorder]}>
            <View style={styles.rowIcon}>
              <Icon name={r.icon} size={20} color={theme.colors.textOnSunken} />
            </View>
            <Text variant="body" style={styles.rowText}>
              {r.text}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.flex1} />
      {/* A change of `onboarded` is enough: the protected stack in app/_layout redirects to the tabs. */}
      <Button size="lg" fullWidth onPress={() => patch({ onboarded: true })}>
        {t("common:actions.done")}
      </Button>
    </ObShell>
  );
}

const useStyles = createThemedStyles((t) => ({
  flex1: { flex: 1 },
  shieldBadge: {
    width: 52,
    height: 52,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.infoSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  rowsBox: {
    backgroundColor: t.colors.surfaceSunken,
    borderRadius: t.radius.lg,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: "column",
    marginBottom: 24,
  },
  row: { flexDirection: "row", gap: 14, alignItems: "flex-start", paddingVertical: 14 },
  rowBorder: { borderTopWidth: 1, borderTopColor: t.colors.borderSubtle },
  rowIcon: { marginTop: 2 },
  rowText: { flex: 1 },
}));
