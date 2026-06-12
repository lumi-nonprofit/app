/* Check-in · krok 1 — stav (podstatná jména, barva + tvar) a intenzita.
   Draft žije v CheckinDraftProvideru checkin stacku, nikdy se nepersistuje. */
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";
import { useRouter } from "expo-router";
import { Card } from "../../ds/index";
import { LumiHeader } from "../../components/Header";
import LumiCTA from "../../components/CTA";
import MoodShape from "../../components/MoodShape";
import Screen from "../../components/Screen";
import { INTENSITY_LABELS, MOODS } from "../../model";
import type { Intensity } from "../../model";
import { palette, colors, radius, font, leading, shadow, type } from "../../theme";
import { useCheckinDraft } from "./draft";

export default function Step1Screen() {
  const router = useRouter();
  const { draft, setDraft } = useCheckinDraft();
  return (
    <Screen>
      <LumiHeader kicker="Check-in · krok 1 ze 2" title="Jak se právě teď cítíš?" />

      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Jak se právě teď cítíš?"
        accessibilityHint="Vyber stav, který je teď nejblíž."
        style={styles.quadGrid}
      >
        {MOODS.map((m) => {
          const is = draft.mood === m.id;
          return (
            <Pressable
              key={m.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: is }}
              style={({ pressed }) => [
                styles.quad,
                { backgroundColor: m.soft },
                is && styles.quadSelected,
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => setDraft({ mood: m.id, words: [] })}
            >
              <MoodShape mood={m} size={22} />
              <View>
                <Text style={styles.quadName}>{m.name}</Text>
                <Text style={styles.quadAxis}>{m.axis}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* intenzita */}
      <Card style={styles.intensityCard}>
        <View style={styles.intensityHead}>
          <Text style={styles.intensityLabel}>Jak silné to je?</Text>
          <Text style={styles.intensityValue}>{INTENSITY_LABELS[draft.intensity - 1]}</Text>
        </View>
        <Slider
          minimumValue={1}
          maximumValue={5}
          step={1}
          value={draft.intensity}
          accessibilityLabel="Intenzita"
          accessibilityHint="Posunem vybereš sílu pocitu, od jen lehce po hodně silně."
          accessibilityValue={{ text: INTENSITY_LABELS[draft.intensity - 1] }}
          minimumTrackTintColor={palette.sun400}
          maximumTrackTintColor={palette.cream200}
          thumbTintColor={palette.sun500}
          style={styles.slider}
          /* slider má step 1 v rozsahu 1–5, hodnota je tedy vždy Intensity */
          onValueChange={(v) => setDraft({ intensity: v as Intensity })}
        />
        <View style={styles.intensityScale}>
          <Text style={styles.intensityScaleText}>jen lehce</Text>
          <Text style={styles.intensityScaleText}>hodně silně</Text>
        </View>
      </Card>

      <LumiCTA
        disabled={!draft.mood}
        onPress={() => router.push("/checkin/words")}
        hint="Nejdřív klepni na stav, který je teď nejblíž."
      >
        Pokračovat
      </LumiCTA>
    </Screen>
  );
}

const styles = StyleSheet.create({
  /* mřížka kvadrantů (web: grid 1fr 1fr, .lumi-quad) */
  quadGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quad: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 96,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: "transparent",
    padding: 14,
    justifyContent: "space-between",
    gap: 10,
  },
  quadSelected: { borderColor: palette.sun400, ...shadow.glow },
  quadName: {
    ...font.display(600),
    fontSize: type.md,
    lineHeight: leading.body(type.md),
    color: colors.textStrong,
  },
  quadAxis: {
    ...font.body(400),
    fontSize: type.xs,
    lineHeight: leading.body(type.xs),
    color: palette.ink700,
    marginTop: 1,
  },

  /* intenzita */
  intensityCard: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 12 },
  intensityHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 2,
  },
  intensityLabel: {
    ...font.body(600),
    fontSize: type.base,
    lineHeight: leading.body(type.base),
    color: colors.textBody,
  },
  intensityValue: {
    ...font.body(600),
    fontSize: type.sm,
    lineHeight: leading.body(type.sm),
    color: palette.sun700,
  },
  slider: { height: 44 },
  intensityScale: { flexDirection: "row", justifyContent: "space-between" },
  intensityScaleText: {
    ...font.body(400),
    fontSize: type.xs,
    lineHeight: leading.body(type.xs),
    color: palette.ink700,
  },
});
