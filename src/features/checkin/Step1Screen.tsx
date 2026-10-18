/* Check-in · krok 1 — stav (podstatná jména, barva + tvar) a intenzita.
   Draft žije v CheckinDraftProvideru checkin stacku, nikdy se nepersistuje.
   Vybraná dlaždice = obrys selectionBorder (≥ 3:1) + fajfka, nikdy jen barva. */
import React from "react";
import { View, Pressable } from "react-native";
import Slider from "@react-native-community/slider";
import { useRouter } from "expo-router";
import { Button, Card, Icon, Text } from "../../ds";
import { pressFeedback, pressedStyle } from "../../ds/press";
import { LumiHeader } from "../../components/Header";
import MoodShape from "../../components/MoodShape";
import Screen from "../../components/Screen";
import { MOODS, intensityLabel } from "../../model";
import type { Intensity } from "../../model";
import { haptics } from "../../lib/haptics";
import { useDiscardGuard } from "../../lib/useDiscardGuard";
import { createThemedStyles, useTheme } from "../../theme";
import { isDraftDirty, useCheckinDraft } from "./draft";

export default function Step1Screen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useStyles();
  const { draft, setDraft, saved } = useCheckinDraft();
  /* Zrušit, swipe-down i hardware Back se při rozepsaném zápisu nejdřív zeptají */
  useDiscardGuard({
    dirty: !saved && isDraftDirty(draft),
    title: "Zahodit rozepsaný zápis?",
    message: "Vybraný stav, slova ani poznámka se neuloží.",
  });
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
          const moodColors = theme.mood[m.id];
          return (
            <Pressable
              key={m.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: is }}
              {...pressFeedback(theme)}
              style={({ pressed }) => [
                styles.quad,
                { backgroundColor: moodColors.soft },
                is && styles.quadSelected,
                pressedStyle(theme, pressed),
              ]}
              onPress={() => {
                haptics.select();
                setDraft({ mood: m.id, words: [] });
              }}
            >
              <View style={styles.quadTop}>
                <MoodShape mood={m} size={22} />
                {is ? (
                  <Icon name="check" size={18} weight="semibold" color={theme.colors.textAccent} />
                ) : null}
              </View>
              <View>
                <Text variant="headline">{m.name}</Text>
                {/* na měkké výplni jen silný tón odstínu nebo textStrong/textBody */}
                <Text variant="caption1" weight="regular" style={{ color: moodColors.strong }}>
                  {m.axis}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* intenzita */}
      <Card style={styles.intensityCard}>
        <View style={styles.intensityHead}>
          <Text variant="body" weight="semibold" color="textBody">
            Jak silné to je?
          </Text>
          <Text variant="footnote" weight="semibold" color="textAccent">
            {intensityLabel(draft.intensity)}
          </Text>
        </View>
        <Slider
          minimumValue={1}
          maximumValue={5}
          step={1}
          value={draft.intensity}
          accessibilityLabel="Intenzita"
          accessibilityHint="Posunem vybereš sílu pocitu, od jen lehce po hodně silně."
          accessibilityValue={{ text: intensityLabel(draft.intensity) }}
          minimumTrackTintColor={theme.colors.accentFill}
          maximumTrackTintColor={theme.colors.borderStrong}
          thumbTintColor={theme.colors.accentFill}
          style={styles.slider}
          /* slider má step 1 v rozsahu 1–5, hodnota je tedy vždy Intensity */
          onValueChange={(v) => setDraft({ intensity: v as Intensity })}
        />
        <View style={styles.intensityScale}>
          <Text variant="caption1" weight="regular">
            jen lehce
          </Text>
          <Text variant="caption1" weight="regular">
            hodně silně
          </Text>
        </View>
      </Card>

      <Button
        size="lg"
        fullWidth
        disabled={!draft.mood}
        onPress={() => router.push("/checkin/words")}
        hint="Nejdřív klepni na stav, který je teď nejblíž."
      >
        Pokračovat
      </Button>
    </Screen>
  );
}

const useStyles = createThemedStyles((t) => ({
  /* mřížka kvadrantů (web: grid 1fr 1fr, .lumi-quad) */
  quadGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quad: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 96,
    borderRadius: t.radius.md,
    borderWidth: 1.5,
    borderColor: "transparent",
    padding: 14,
    justifyContent: "space-between",
    gap: 10,
    overflow: "hidden",
  },
  quadTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  quadSelected: { borderColor: t.colors.selectionBorder },

  /* intenzita */
  intensityCard: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 12 },
  intensityHead: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 2,
  },
  slider: { height: t.platform.minTouch },
  intensityScale: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
}));
