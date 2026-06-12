/* Onboarding — 3 obrazovky (jméno, věk, soukromí), bez tab baru. */
import React from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, IconButton, Input } from "../ds/index.js";
import LumiCTA from "../components/CTA.jsx";
import LumiMark from "../components/LumiMark.jsx";
import { palette, colors, radius, font, leading, tracking, shadow } from "../theme.js";

function ObShell({ step, onBack, children }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.top, { paddingTop: insets.top + 24 }]}>
          {onBack ? <IconButton icon="arrow-left" label="Zpět" onPress={onBack} /> : <View style={styles.topSpacer} />}
          <View style={styles.dots} accessibilityLabel={`Krok ${step} ze 3`}>
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

function ObTitle({ title, body }) {
  return (
    <View style={styles.titleWrap}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {body ? <Text style={styles.titleBody}>{body}</Text> : null}
    </View>
  );
}

/* 1 — přivítání + jméno */
export function OnboardingName({ name, onName, onNext }) {
  return (
    <ObShell step={1}>
      <LumiMark size={52} style={styles.mark} />
      <ObTitle
        title="Ahoj, tady Lumi."
        body="Pomůžu ti všímat si, jak se máš, a hledat, co ti dělá dobře. Všechno zůstává u tebe."
      />
      <Input
        label="Jak ti máme říkat?"
        placeholder="Třeba Alex"
        hint="Jen pro oslovení — nikam se neposílá."
        value={name}
        onChangeText={(v) => onName(v)}
      />
      <View style={styles.flex1} />
      <LumiCTA disabled={!name.trim()} onPress={onNext} hint="Stačí napsat, jak ti máme říkat.">
        Pokračovat
      </LumiCTA>
    </ObShell>
  );
}

/* 2 — věk (určuje primární krizovou linku) */
export function OnboardingAge({ age, onAge, onNext, onBack }) {
  const options = [
    { id: "u26", label: "do 26 let", meta: "Primární linka: Linka bezpečí 116 111" },
    { id: "plus27", label: "27 a více", meta: "Primární linka: Linka první psychické pomoci 116 123" },
  ];
  return (
    <ObShell step={2} onBack={onBack}>
      <ObTitle title="Kolik ti je?" body="Podle věku ti nabídneme správnou krizovou linku." />
      <View accessibilityRole="radiogroup" accessibilityLabel="Věkové pásmo" style={styles.optGroup}>
        {options.map((o) => {
          const is = age === o.id;
          return (
            <Pressable
              key={o.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: is }}
              onPress={() => onAge(o.id)}
              style={({ pressed }) => [
                styles.opt,
                is && styles.optSelected,
                pressed && { transform: [{ scale: 0.99 }] },
              ]}
            >
              <View style={[styles.optRadio, is && styles.optRadioSelected]} accessible={false}>
                {is ? <View style={styles.optDot} /> : null}
              </View>
              <View style={styles.flex1}>
                <Text style={styles.optLabel}>{o.label}</Text>
                <Text style={styles.optMeta}>{o.meta}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.flex1} />
      <LumiCTA disabled={!age} onPress={onNext} hint="Vyber jedno z pásem — jde jen o krizovou linku.">
        Pokračovat
      </LumiCTA>
    </ObShell>
  );
}

/* 3 — soukromí: bez právničiny, sdílení default vypnuté */
export function OnboardingPrivacy({ onDone, onBack }) {
  const rows = [
    { icon: "smartphone", text: "Tvoje záznamy zůstávají jen v tomhle telefonu." },
    { icon: "flask-conical", text: "Pokud někdy budeš chtít, můžeš je anonymně sdílet pro výzkum — ale jen pokud to v nastavení zapneš." },
    { icon: "toggle-left", text: "Teď je sdílení vypnuté." },
  ];
  return (
    <ObShell step={3} onBack={onBack}>
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
      <LumiCTA onPress={onDone}>Rozumím, jdeme na to</LumiCTA>
    </ObShell>
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
    fontSize: 30,
    letterSpacing: tracking.display(30),
    color: colors.textStrong,
    lineHeight: leading.tight(30),
  },
  titleBody: { ...font.body(400), fontSize: 16, lineHeight: leading.body(16), color: colors.textBody },

  mark: { marginBottom: 18 },

  /* .lumi-opt */
  optGroup: { flexDirection: "column", gap: 12 },
  opt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    minHeight: 64,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1.5,
    borderColor: "transparent",
    borderRadius: radius.lg,
    ...shadow.card,
  },
  optSelected: { borderColor: palette.sun400, ...shadow.glow },
  optRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  optRadioSelected: { borderColor: palette.sun500 },
  optDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: palette.sun500 },
  optLabel: { ...font.body(600), fontSize: 17, color: colors.textStrong },
  optMeta: { ...font.body(400), fontSize: 13, color: palette.ink700, marginTop: 2 },

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
  rowText: { flex: 1, ...font.body(400), fontSize: 15, lineHeight: Math.round(15 * 1.5), color: colors.textBody },
});
