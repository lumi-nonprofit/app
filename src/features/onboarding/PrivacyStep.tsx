/* Onboarding 3 — soukromí: bez právničiny, sdílení default vypnuté */
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Icon } from "../../ds/index";
import type { IconName } from "../../ds/Icon";
import LumiCTA from "../../components/CTA";
import { useAppStore } from "../../store";
import { palette, colors, radius, font, leading, type } from "../../theme";
import { ObShell, ObTitle } from "./Shell";

export default function PrivacyStep() {
  const { patch } = useAppStore();
  const router = useRouter();
  const rows: { icon: IconName; text: string }[] = [
    { icon: "smartphone", text: "Tvoje záznamy zůstávají jen v tomhle telefonu." },
    {
      icon: "flask-conical",
      text: "Pokud někdy budeš chtít, můžeš je anonymně sdílet pro výzkum — ale jen pokud to v nastavení zapneš.",
    },
    { icon: "toggle-left", text: "Teď je sdílení vypnuté." },
  ];
  return (
    <ObShell step={3} onBack={() => router.back()}>
      <View style={styles.shieldBadge}>
        <Icon name="shield" size={26} color={palette.lake700} />
      </View>
      <ObTitle title="Tvoje data zůstávají u tebe" />
      <View style={styles.rowsBox}>
        {rows.map((r, i) => (
          <View key={r.icon} style={[styles.row, i > 0 && styles.rowBorder]}>
            <View style={styles.rowIcon}>
              <Icon name={r.icon} size={20} color={palette.ink700} />
            </View>
            <Text style={styles.rowText}>{r.text}</Text>
          </View>
        ))}
      </View>
      <View style={styles.flex1} />
      {/* Stačí přepnout onboarded — Protected stack v app/_layout sám přesměruje na taby. */}
      <LumiCTA onPress={() => patch({ onboarded: true })}>Rozumím, jdeme na to</LumiCTA>
    </ObShell>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  shieldBadge: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.infoSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  rowsBox: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.lg,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: "column",
  },
  row: { flexDirection: "row", gap: 14, alignItems: "flex-start", paddingVertical: 14 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  rowIcon: { marginTop: 2 },
  rowText: {
    flex: 1,
    ...font.body(400),
    fontSize: type.base,
    lineHeight: leading.body(type.base),
    color: colors.textBody,
  },
});
