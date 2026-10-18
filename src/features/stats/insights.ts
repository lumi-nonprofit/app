/* Local insights: pure functions over the entries of a period. The wording is always
   descriptive and never causal ("came with", "shows up", never "because of"). Below the data
   threshold the functions return nothing. The sentences come from the `stats` catalog; the
   gender of the Czech verb follows the mood through the i18next context. */
import { MOOD_BY_ID, tagLabel, wordLabel, type Entry, type MoodId } from "../../model";
import { isTagId } from "../../db/vocab";
import i18n from "../../i18n";
import { contentText } from "../../i18n/content";

export interface Insight {
  id: string;
  text: string;
}

export type Period = "week" | "month";
export type Daypart = "morning" | "afternoon" | "evening";

/** Threshold: a pattern needs 3 occurrences of the combination, and 3 entries in total. */
export const INSIGHT_MIN_OCCURRENCES = 3;

/** The text below the data threshold, in the active language. */
export function tooFewDataText(): string {
  return i18n.t("stats:insights.tooFewData");
}

/* The instrumental case of a built-in tag ("se školou") comes from the catalog; a custom tag
   gets the generic form ("se štítkem „X“"), because the app cannot decline unknown words. */
const tagPhrase = (tag: string): string =>
  isTagId(tag)
    ? contentText(`tags.${tag}.instrumental`)
    : contentText("tags.custom.instrumental", { tag: tagLabel(tag) });

const topOf = (counts: Map<string, number>): [string, number] | null => {
  let best: [string, number] | null = null;
  for (const [key, n] of counts) if (!best || n > best[1]) best = [key, n];
  return best;
};

function countBy<T>(items: T[], key: (item: T) => string | null): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    if (k === null) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

/** The part of the day of an entry time: morning before 12, afternoon 12 to 17, evening from 18. */
export function daypartOf(time: string): Daypart {
  const hour = Number.parseInt(time, 10);
  if (Number.isNaN(hour) || hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

/** (a) The most frequent mood and word of the period. */
function frequentInsight(entries: Entry[], period: Period): Insight | null {
  if (entries.length < INSIGHT_MIN_OCCURRENCES) return null;
  const topMood = topOf(countBy(entries, (e) => e.mood));
  if (!topMood) return null;
  const mood = MOOD_BY_ID[topMood[0] as MoodId];
  const words = topOf(
    countBy(
      entries.filter((e) => e.mood === mood.id).flatMap((e) => e.words),
      (w) => w,
    ),
  );
  const periodText = i18n.t("stats:period.sentenceStart", { context: period });
  const text = words
    ? i18n.t("stats:insights.frequentWithWord", {
        period: periodText,
        mood: mood.nameInSentence,
        word: wordLabel(words[0]),
      })
    : i18n.t("stats:insights.frequent", { period: periodText, mood: mood.nameInSentence });
  return { id: "frequent", text };
}

/** (b) The co-occurrence of a tag and a mood, only with 3 or more occurrences of the pair. */
function tagMoodInsight(entries: Entry[], period: Period): Insight | null {
  const pairs = countBy(
    entries.flatMap((e) => e.tags.map((t) => ({ mood: e.mood, tag: t }))),
    (p) => `${p.mood} ${p.tag}`,
  );
  const top = topOf(pairs);
  if (!top || top[1] < INSIGHT_MIN_OCCURRENCES) return null;
  // A tag can contain spaces: the key splits at the first separator only.
  const sep = top[0].indexOf(" ");
  const moodId = top[0].slice(0, sep) as MoodId;
  const tag = top[0].slice(sep + 1);
  const mood = MOOD_BY_ID[moodId];
  return {
    id: "tag-mood",
    text: i18n.t("stats:insights.tagMood", {
      context: moodId,
      mood: mood.name,
      period: i18n.t("stats:period.inSentence", { context: period }),
      tag: tagPhrase(tag),
    }),
  };
}

/** (c) The pattern of the part of the day (morning, afternoon, evening and mood), threshold 3. */
function daypartInsight(entries: Entry[]): Insight | null {
  const pairs = countBy(entries, (e) => `${daypartOf(e.time)} ${e.mood}`);
  const top = topOf(pairs);
  if (!top || top[1] < INSIGHT_MIN_OCCURRENCES) return null;
  const [daypart, moodId] = top[0].split(" ") as [Daypart, MoodId];
  return {
    id: "daypart",
    text: i18n.t("stats:insights.daypart", {
      context: daypart,
      mood: MOOD_BY_ID[moodId].nameInSentence,
    }),
  };
}

/** At most 3 insights, in this order: the frequent mood, tag and mood, part of the day. */
export function computeInsights(entries: Entry[], period: Period = "month"): Insight[] {
  const found = [
    frequentInsight(entries, period),
    tagMoodInsight(entries, period),
    daypartInsight(entries),
  ].filter((i): i is Insight => i !== null);
  return found.slice(0, 3);
}
