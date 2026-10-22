/* Check-in, step 1: the state (nouns, colour + shape) and the intensity. The draft lives in the
   CheckinDraftProvider of the check-in stack; nothing persists it. A selected tile has the
   selectionBorder outline (at least 3:1) and a check mark, never only a colour. */
import React from "react";
import { View, Pressable } from "react-native";
import Slider from "@react-native-community/slider";
import { useRouter } from "expo-router";
import { Button, Card, Icon, Text } from "../../ds";
import { pressFeedback, pressedStyle } from "../../ds/press";
import { LumiHeader } from "../../components/Header";
import MoodShape from "../../components/MoodShape";
import Screen from "../../components/Screen";
import { useTranslation } from "../../i18n";
import { MOODS, intensityLabel } from "../../model";
import type { Intensity } from "../../model";
import { haptics } from "../../lib/haptics";
import { useDiscardGuard } from "../../lib/useDiscardGuard";
import { createThemedStyles, useTheme } from "../../theme";
import { isDraftDirty, useCheckinDraft } from "./draft";

export default function Step1Screen() {
  const { t } = useTranslation(["checkin", "common"]);
  const router = useRouter();
  const theme = useTheme();
  const styles = useStyles();
  const { draft, setDraft, saved } = useCheckinDraft();
  /* "Zrušit", swipe-down and the hardware back button ask first when the entry has content. */
  useDiscardGuard({
    dirty: !saved && isDraftDirty(draft),
    title: t("discard.title"),
    message: t("discard.message"),
  });
  return (
    <Screen>
      <LumiHeader kicker={t("step1.kicker")} title={t("step1.title")} />

      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t("step1.moods.a11yLabel")}
        accessibilityHint={t("step1.moods.a11yHint")}
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
                {/* On the soft fill only the strong tone of the hue, or textStrong/textBody. */}
                <Text variant="caption1" weight="regular" style={{ color: moodColors.strong }}>
                  {m.axis}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* The intensity. */}
      <Card style={styles.intensityCard}>
        <View style={styles.intensityHead}>
          <Text variant="body" weight="semibold" color="textBody">
            {t("step1.intensity.title")}
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
          accessibilityLabel={t("step1.intensity.a11yLabel")}
          accessibilityHint={t("step1.intensity.a11yHint", {
            min: intensityLabel(1),
            max: intensityLabel(5),
          })}
          accessibilityValue={{ text: intensityLabel(draft.intensity) }}
          minimumTrackTintColor={theme.colors.accentFill}
          maximumTrackTintColor={theme.colors.borderStrong}
          thumbTintColor={theme.colors.accentFill}
          style={styles.slider}
          /* The slider has step 1 in the range 1 to 5, so the value is always an Intensity. */
          onValueChange={(v) => setDraft({ intensity: v as Intensity })}
        />
        <View style={styles.intensityScale}>
          <Text variant="caption1" weight="regular">
            {intensityLabel(1)}
          </Text>
          <Text variant="caption1" weight="regular">
            {intensityLabel(5)}
          </Text>
        </View>
      </Card>

      <Button
        size="lg"
        fullWidth
        disabled={!draft.mood}
        onPress={() => router.push("/checkin/words")}
        hint={t("step1.continueHint")}
      >
        {t("common:actions.continue")}
      </Button>
    </Screen>
  );
}

const useStyles = createThemedStyles((t) => ({
  /* The grid of the quadrants (web: grid 1fr 1fr, .lumi-quad). */
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

  /* The intensity. */
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
