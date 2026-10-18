/* Check-in, step 2: the words that refine the state (1 to 2), the context tags and an optional
   note. The save writes the Entry to the database and leads to the confirmation. */
import React from "react";
import { View, TextInput } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { Button, Chip, Input, Text } from "../../ds";
import { textStyle } from "../../ds/Text";
import { LumiHeader } from "../../components/Header";
import MoodShape from "../../components/MoodShape";
import Screen from "../../components/Screen";
import { useTranslation } from "../../i18n";
import {
  CONTEXT_TAGS,
  MOOD_BY_ID,
  MOOD_WORDS,
  intensityLabel,
  nowTime,
  tagLabel,
  toISODate,
  wordLabel,
} from "../../model";
import type { Entry, MoodId } from "../../model";
import { newEntryId } from "../../store";
import { useDb, useDbVersion } from "../../db/provider";
import { useDbWriter } from "../../db/hooks";
import { addCustomTag, deleteCustomTag, insertEntry, listCustomTags } from "../../db/repo";
import type { Tag } from "../../db/repo";
import { confirmDelete } from "../../lib/dialogs";
import { haptics } from "../../lib/haptics";
import { useDiscardGuard } from "../../lib/useDiscardGuard";
import { createThemedStyles, useTheme } from "../../theme";
import { isDraftDirty, useCheckinDraft } from "./draft";

export default function Step2Screen() {
  const { t } = useTranslation(["checkin", "common"]);
  const router = useRouter();
  const theme = useTheme();
  const styles = useStyles();
  const { draft, setDraft, saved, markSaved } = useCheckinDraft();
  const writeDb = useDbWriter();
  const navigation = useNavigation();
  /* The guard catches only the close of the whole sheet (swipe-down is a POP that targets the
     root stack). Back (GO_BACK) and a pop inside the check-in stack only return to step 1: the
     draft lives in the provider, nothing is lost. The save leaves through leave(). */
  const { leave } = useDiscardGuard({
    dirty: !saved && isDraftDirty(draft),
    title: t("discard.title"),
    message: t("discard.message"),
    allow: (action) =>
      action.type === "GO_BACK" ||
      action.type === "REPLACE" ||
      (action.type === "POP" &&
        (action.target === undefined || action.target === navigation.getState()?.key)),
  });

  /* draft.mood can be null: the fallback after `||` covers it; the cast serves only the index. */
  const mood = MOOD_BY_ID[draft.mood as MoodId] || MOOD_BY_ID.napeti;
  const moodColors = theme.mood[mood.id];
  const words = MOOD_WORDS[mood.id];
  const toggleWord = (w: string) => {
    const has = draft.words.includes(w);
    if (has) setDraft({ words: draft.words.filter((x) => x !== w) });
    else if (draft.words.length < 2) setDraft({ words: [...draft.words, w] });
    else return; // The third word stays unselected: no haptics.
    haptics.select();
  };
  const toggleTag = (tag: string) => {
    const has = draft.tags.includes(tag);
    setDraft({ tags: has ? draft.tags.filter((x) => x !== tag) : [...draft.tags, tag] });
    haptics.select();
  };

  /* Custom tags always come after the built-in ones; the data version forces a new query after a write. */
  const db = useDb();
  const { version } = useDbVersion();
  const customTags = React.useMemo(() => {
    void version; // A write raises the version, which forces the query to run again.
    return listCustomTags(db);
  }, [db, version]);

  const [addingTag, setAddingTag] = React.useState(false);
  const [newTagLabel, setNewTagLabel] = React.useState("");
  const toggleAddTag = () => {
    setAddingTag((open) => !open);
    setNewTagLabel("");
  };
  /* An empty input does nothing. A duplicate label returns the existing tag, which only gets selected. */
  const submitNewTag = () => {
    const label = newTagLabel.trim();
    if (!label) return;
    const tag = writeDb((d) => addCustomTag(d, label));
    if (tag && !draft.tags.includes(tag.label)) setDraft({ tags: [...draft.tags, tag.label] });
    setNewTagLabel("");
    setAddingTag(false);
    haptics.select();
  };
  /* Only custom tags can go; the entries that already use the tag stay unchanged. */
  const confirmDeleteTag = (tag: Tag) => {
    confirmDelete({ title: t("step2.deleteTag.title"), message: t("step2.deleteTag.message") })
      .then((ok) => {
        if (!ok) return;
        writeDb((d) => deleteCustomTag(d, tag.id));
        setDraft({ tags: draft.tags.filter((x) => x !== tag.label) });
      })
      .catch(() => {});
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
    writeDb((d) => insertEntry(d, entry)); // An INSERT, no rewrite of the whole table.
    haptics.success();
    markSaved();
    /* replace, not push: the hardware back button from the confirmation does not return to the saved step. */
    leave(() => router.replace("/checkin/confirm"));
  };

  return (
    <Screen keyboard>
      {/* Back to step 1 is the system back button in the native header. */}
      <LumiHeader kicker={t("step2.kicker")} title={t("step2.title")} />

      {/* The summary of the chosen state: on the soft fill only textStrong/textBody. */}
      <View style={[styles.moodSummary, { backgroundColor: moodColors.soft }]}>
        <MoodShape mood={mood} size={18} />
        <Text variant="body" weight="semibold" color="textStrong">
          {mood.name}
        </Text>
        <Text variant="subheadline" color="textBody">
          {t("step2.summary.intensity", { intensity: intensityLabel(draft.intensity) })}
        </Text>
      </View>

      <View>
        <Text variant="subheadline" color="textMuted" style={styles.wordsHint}>
          {t("step2.words.hint")}
        </Text>
        <View style={styles.chipWrap}>
          {words.map((w) => (
            <Chip key={w} selected={draft.words.includes(w)} onPress={() => toggleWord(w)}>
              {wordLabel(w)}
            </Chip>
          ))}
        </View>
      </View>

      <View>
        <Text variant="body" weight="semibold" color="textBody" style={styles.tagsLabel}>
          {t("step2.tags.title")}
        </Text>
        <View style={styles.chipWrap}>
          {CONTEXT_TAGS.map((tag) => (
            <Chip key={tag} selected={draft.tags.includes(tag)} onPress={() => toggleTag(tag)}>
              {tagLabel(tag)}
            </Chip>
          ))}
          {customTags.map((tag) => (
            <Chip
              key={tag.id}
              selected={draft.tags.includes(tag.label)}
              onPress={() => toggleTag(tag.label)}
              onLongPress={() => confirmDeleteTag(tag)}
              accessibilityHint={t("step2.tags.custom.a11yHint")}
            >
              {tag.label}
            </Chip>
          ))}
          <Chip
            onPress={toggleAddTag}
            accessibilityHint={
              addingTag ? t("step2.newTag.close.a11yHint") : t("step2.newTag.open.a11yHint")
            }
          >
            {t("step2.newTag.chip")}
          </Chip>
        </View>
        {addingTag ? (
          <View style={styles.addTagRow}>
            <TextInput
              style={styles.addTagInput}
              value={newTagLabel}
              onChangeText={setNewTagLabel}
              placeholder={t("step2.newTag.placeholder")}
              placeholderTextColor={theme.colors.textOnSunken}
              selectionColor={theme.colors.accentFill}
              autoFocus
              returnKeyType="done"
              maxLength={24}
              onSubmitEditing={submitNewTag}
              accessibilityLabel={t("step2.newTag.a11yLabel")}
              accessibilityHint={t("step2.newTag.a11yHint")}
            />
            <Button variant="secondary" size="sm" onPress={submitNewTag}>
              {t("common:actions.add")}
            </Button>
          </View>
        ) : null}
      </View>

      <Input
        label={t("step2.note.label")}
        placeholder={t("step2.note.placeholder")}
        multiline
        value={draft.note}
        onChangeText={(v) => setDraft({ note: v })}
      />

      <Button
        size="lg"
        fullWidth
        disabled={draft.words.length === 0}
        onPress={save}
        hint={t("step2.saveHint")}
      >
        {t("step2.save")}
      </Button>
    </Screen>
  );
}

const useStyles = createThemedStyles((t) => ({
  moodSummary: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    borderRadius: t.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  wordsHint: { marginBottom: 8 },
  tagsLabel: { marginTop: 4, marginBottom: 8 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  addTagRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  /* The inline input matches the chip style (pill, subheadline); the height keeps the touch target. */
  addTagInput: {
    flex: 1,
    ...textStyle("subheadline", "medium"),
    color: t.colors.textBody,
    backgroundColor: t.colors.surfaceSunken,
    borderWidth: 1.5,
    borderColor: t.colors.borderStrong,
    borderRadius: t.radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 14,
    minHeight: t.platform.minTouch,
  },
}));
