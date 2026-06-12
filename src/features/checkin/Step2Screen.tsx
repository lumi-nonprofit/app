/* Check-in · krok 2 — upřesňující slova (1–2), kontextové štítky, nepovinná
   poznámka; uložení zapíše Entry do stavu aplikace a vede na potvrzení. */
import React from "react";
import { View, Text, TextInput, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Button, Chip, IconButton, Input } from "../../ds/index";
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
import { newEntryId } from "../../store";
import { useDb, useDbVersion } from "../../db/provider";
import { useDbWriter } from "../../db/hooks";
import { addCustomTag, deleteCustomTag, insertEntry, listCustomTags } from "../../db/repo";
import type { Tag } from "../../db/repo";
import { haptics } from "../../lib/haptics";
import { palette, colors, radius, font, leading, tracking, type } from "../../theme";
import { useCheckinDraft } from "./draft";

export default function Step2Screen() {
  const router = useRouter();
  const { draft, setDraft } = useCheckinDraft();
  const writeDb = useDbWriter();

  /* draft.mood může být null — fallback za `||` to jistí, přetypování jen pro index */
  const mood = MOOD_BY_ID[draft.mood as MoodId] || MOOD_BY_ID.napeti;
  const words = MOOD_WORDS[mood.id];
  const toggleWord = (w: string) => {
    const has = draft.words.includes(w);
    if (has) setDraft({ words: draft.words.filter((x) => x !== w) });
    else if (draft.words.length < 2) setDraft({ words: [...draft.words, w] });
    else return; // třetí slovo se nevybere — bez haptiky
    haptics.select();
  };
  const toggleTag = (t: string) => {
    const has = draft.tags.includes(t);
    setDraft({ tags: has ? draft.tags.filter((x) => x !== t) : [...draft.tags, t] });
    haptics.select();
  };

  /* vlastní štítky — řadí se vždy za vestavěné; verze dat vynutí re-query po zápisu */
  const db = useDb();
  const { version } = useDbVersion();
  const customTags = React.useMemo(() => {
    void version; // zápis zvyšuje verzi → vynucený re-query
    return listCustomTags(db);
  }, [db, version]);

  const [addingTag, setAddingTag] = React.useState(false);
  const [newTagLabel, setNewTagLabel] = React.useState("");
  const toggleAddTag = () => {
    setAddingTag((open) => !open);
    setNewTagLabel("");
  };
  /* Prázdný vstup nic nedělá. Duplicitní label vrátí existující štítek → jen se vybere. */
  const submitNewTag = () => {
    const label = newTagLabel.trim();
    if (!label) return;
    const tag = writeDb((d) => addCustomTag(d, label));
    if (tag && !draft.tags.includes(tag.label)) setDraft({ tags: [...draft.tags, tag.label] });
    setNewTagLabel("");
    setAddingTag(false);
    haptics.select();
  };
  /* Mazat jde jen vlastní štítky; záznamy, kde už je štítek použitý, zůstávají beze změny. */
  const confirmDeleteTag = (tag: Tag) => {
    Alert.alert("Smazat štítek?", "Záznamy, kde už je použitý, zůstanou beze změny.", [
      { text: "Zrušit", style: "cancel" },
      {
        text: "Smazat",
        style: "destructive",
        onPress: () => {
          writeDb((d) => deleteCustomTag(d, tag.id));
          setDraft({ tags: draft.tags.filter((t) => t !== tag.label) });
        },
      },
    ]);
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
    writeDb((d) => insertEntry(d, entry)); // INSERT, žádné přepisování celku
    haptics.success();
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
          {customTags.map((t) => (
            <Chip
              key={t.id}
              selected={draft.tags.includes(t.label)}
              onPress={() => toggleTag(t.label)}
              onLongPress={() => confirmDeleteTag(t)}
              accessibilityHint="Podržením smažeš štítek."
            >
              {t.label}
            </Chip>
          ))}
          <Chip
            onPress={toggleAddTag}
            accessibilityHint={
              addingTag ? "Zavře pole pro nový štítek." : "Otevře pole pro nový štítek."
            }
          >
            + přidat
          </Chip>
        </View>
        {addingTag ? (
          <View style={styles.addTagRow}>
            <TextInput
              style={styles.addTagInput}
              value={newTagLabel}
              onChangeText={setNewTagLabel}
              placeholder="nový štítek"
              placeholderTextColor={colors.textFaint}
              autoFocus
              returnKeyType="done"
              maxLength={24}
              onSubmitEditing={submitNewTag}
              accessibilityLabel="Nový štítek"
              accessibilityHint="Napiš název a potvrď tlačítkem Přidat."
            />
            <Button variant="secondary" size="sm" onPress={submitNewTag}>
              Přidat
            </Button>
          </View>
        ) : null}
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
  addTagRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  /* inline vstup stylem odpovídá chipu (pill, sm text), výška drží dotykový cíl 44 pt */
  addTagInput: {
    flex: 1,
    ...font.body(500),
    fontSize: type.sm,
    color: colors.textBody,
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 14,
    minHeight: 44,
  },
});
