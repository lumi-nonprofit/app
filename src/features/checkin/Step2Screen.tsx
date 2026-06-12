/* Check-in · krok 2 — upřesňující slova (1–2), kontextové štítky, nepovinná
   poznámka; uložení zapíše Entry do stavu aplikace a vede na potvrzení. */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Chip, IconButton, Input } from "../../ds/index";
import { LumiHeader } from "../../components/Header";
import LumiCTA from "../../components/CTA";
import MoodShape from "../../components/MoodShape";
import Screen from "../../components/Screen";
import {
  CONTEXT_TAGS,
  INTENSITY_LABELS,
  MOOD_BY_ID,
  MOOD_WORDS,
  nowTime,
  toISODate,
} from "../../model";
import type { Entry, MoodId } from "../../model";
import { newEntryId, useAppStore } from "../../store";
import { palette, colors, radius, font, leading, tracking, type } from "../../theme";
import { useCheckinDraft } from "./draft";

export default function Step2Screen() {
  const router = useRouter();
  const { draft, setDraft } = useCheckinDraft();
  const { state, patch } = useAppStore();

  /* draft.mood může být null — fallback za `||` to jistí, přetypování jen pro index */
  const mood = MOOD_BY_ID[draft.mood as MoodId] || MOOD_BY_ID.napeti;
  const words = MOOD_WORDS[mood.id];
  const toggleWord = (w: string) => {
    const has = draft.words.includes(w);
    if (has) setDraft({ words: draft.words.filter((x) => x !== w) });
    else if (draft.words.length < 2) setDraft({ words: [...draft.words, w] });
  };
  const toggleTag = (t: string) => {
    const has = draft.tags.includes(t);
    setDraft({ tags: has ? draft.tags.filter((x) => x !== t) : [...draft.tags, t] });
  };
  const save = () => {
    if (!draft.mood) return;
    const now = new Date();
    const entry: Entry = {
      id: newEntryId(),
      date: toISODate(now),
      time: nowTime(now),
      mood: draft.mood,
      intensity: draft.intensity,
      words: draft.words,
      tags: draft.tags,
      note: draft.note.trim(),
    };
    patch({ entries: [...state.entries, entry] });
    /* replace, ne push: hardware back z potvrzení se nevrací na už uložený krok */
    router.replace("/checkin/confirm");
  };

  return (
    <Screen>
      <View style={styles.backRow}>
        <IconButton icon="arrow-left" label="Zpět na krok 1" onPress={() => router.back()} />
        <Text style={styles.kicker}>Check-in · krok 2 ze 2</Text>
      </View>
      <LumiHeader title="Které slovo to vystihuje nejlíp?" />

      {/* shrnutí zvoleného stavu */}
      <View style={[styles.moodSummary, { backgroundColor: mood.soft }]}>
        <MoodShape mood={mood} size={18} />
        <Text style={styles.moodSummaryName}>{mood.name}</Text>
        <Text style={styles.moodSummaryIntensity}>· {INTENSITY_LABELS[draft.intensity - 1]}</Text>
      </View>

      <View>
        <Text style={styles.wordsHint}>Vyber jedno nebo dvě.</Text>
        <View style={styles.chipWrap}>
          {words.map((w) => (
            <Chip key={w} selected={draft.words.includes(w)} onPress={() => toggleWord(w)}>
              {w}
            </Chip>
          ))}
        </View>
      </View>

      <View>
        <Text style={styles.tagsLabel}>Co s tím souvisí?</Text>
        <View style={styles.chipWrap}>
          {CONTEXT_TAGS.map((t) => (
            <Chip key={t} selected={draft.tags.includes(t)} onPress={() => toggleTag(t)}>
              {t}
            </Chip>
          ))}
        </View>
      </View>

      <Input
        label="Poznámka"
        placeholder="Co máš na srdci? (nepovinné)"
        multiline
        value={draft.note}
        onChangeText={(v) => setDraft({ note: v })}
      />

      <LumiCTA
        disabled={draft.words.length === 0}
        onPress={save}
        hint="Vyber aspoň jedno slovo — pomáhá v Přehledech."
      >
        Uložit zápis
      </LumiCTA>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backRow: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: -6 },
  kicker: {
    ...font.body(600),
    fontSize: type.xxs,
    letterSpacing: tracking.label(type.xxs),
    textTransform: "uppercase",
    color: palette.ink700,
  },
  moodSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  moodSummaryName: {
    ...font.body(600),
    fontSize: type.base,
    lineHeight: leading.body(type.base),
    color: colors.textStrong,
  },
  moodSummaryIntensity: {
    ...font.body(400),
    fontSize: type.sm,
    lineHeight: leading.body(type.sm),
    color: palette.ink700,
  },
  wordsHint: {
    ...font.body(400),
    fontSize: type.sm,
    lineHeight: leading.body(type.sm),
    color: palette.ink700,
    marginBottom: 8,
  },
  tagsLabel: {
    ...font.body(600),
    fontSize: type.base,
    lineHeight: leading.body(type.base),
    color: colors.textBody,
    marginTop: 4,
    marginBottom: 8,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
