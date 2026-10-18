/* Lumi domain model and helpers. The model holds ids, colours and date math. The text of every
   id comes from the message catalog (src/i18n/locales/<locale>/content.json) through getters,
   so the objects read the same as before, in the active language.
   Note: the mood colours differ from the DS MoodPicker on purpose (DS: tense=clay, low=lake, the
   visual signature of the Mood Meter). Here: Napětí=lake (a cold grip), Útlum=clay (dim, heavy
   light). Each mood also has its own shape, so colour is never the only signal. */
import { palette } from "./theme";
import type { IconName } from "./ds/Icon";
import type { BadgeTone } from "./ds/Badge";
import type { Tone } from "./ds/tone";
import i18n from "./i18n";
import { contentText, contentTextOrNull } from "./i18n/content";
import { formatDayHeading } from "./i18n/format";
import { TAG_IDS, WORD_IDS, isTagId, isWordId } from "./db/vocab";
import type { TagId, WordId } from "./db/vocab";

export type { TagId, WordId } from "./db/vocab";
/* The crisis lines live in src/features/help/lines.ts; the model re-exports the primary lines. */
export { HELP_LINES } from "./features/help/lines";
export type { ContactLine as HelpLine } from "./features/help/lines";

/* ---------- domain types ---------- */

export type MoodId = "energie" | "napeti" | "klid" | "utlum";
export type MoodShapeKind = "circle" | "diamond" | "square" | "half";
export type Intensity = 1 | 2 | 3 | 4 | 5;
export type AgeBand = "u26" | "plus27";

/** A local date "YYYY-MM-DD" (the day on the phone, not UTC). */
export type ISODate = string;

export interface Mood {
  id: MoodId;
  /** The name as a heading ("Napětí"). */
  readonly name: string;
  /** The name inside a sentence ("napětí"). */
  readonly nameInSentence: string;
  readonly axis: string;
  color: string;
  soft: string;
  strong: string;
  shape: MoodShapeKind;
}

export interface Entry {
  id: string;
  date: ISODate;
  time: string; // "H:MM"
  mood: MoodId;
  intensity: Intensity;
  /** Word ids (src/db/vocab.ts). */
  words: string[];
  /** Tag ids of the built-in tags, or the text of a custom tag. */
  tags: string[];
  note: string;
}

export interface Who5Measurement {
  score: number; // 0 to 100
  date: ISODate;
}

/** A check-in in progress. It lives in memory only and is never stored. */
export interface CheckinDraft {
  mood: MoodId | null;
  intensity: Intensity;
  words: string[];
  tags: string[];
  note: string;
}

export interface DayAggregate {
  mood: MoodId;
  intensity: Intensity;
}

export interface WeekDay {
  label: string;
  dayName: string;
  iso: ISODate;
  entry: DayAggregate | null;
  today: boolean;
  future: boolean;
}

export interface MonthDay {
  label: string;
  iso: ISODate;
  entry: DayAggregate | null;
  future: boolean;
}

function mood(
  id: MoodId,
  colors: { color: string; soft: string; strong: string },
  shape: MoodShapeKind,
): Mood {
  return {
    id,
    ...colors,
    shape,
    get name() {
      return contentText(`moods.${id}.name`);
    },
    get nameInSentence() {
      return contentText(`moods.${id}.nameInSentence`);
    },
    get axis() {
      return contentText(`moods.${id}.axis`);
    },
  };
}

export const MOODS: Mood[] = [
  mood(
    "energie",
    { color: palette.sun400, soft: palette.sun100, strong: palette.sun700 },
    "circle",
  ),
  mood(
    "napeti",
    { color: palette.lake500, soft: palette.lake100, strong: palette.lake700 },
    "diamond",
  ),
  mood(
    "klid",
    { color: palette.sage500, soft: palette.sage100, strong: palette.sage700 },
    "square",
  ),
  mood("utlum", { color: palette.clay500, soft: palette.clay100, strong: palette.clay700 }, "half"),
];
export const MOOD_BY_ID: Record<MoodId, Mood> = Object.fromEntries(
  MOODS.map((m) => [m.id, m]),
) as Record<MoodId, Mood>;

/** The word ids of each mood, in the order of the chips. */
export const MOOD_WORDS: Record<MoodId, readonly WordId[]> = WORD_IDS;
/** The built-in tag ids, in the order of the chips. */
export const CONTEXT_TAGS: readonly TagId[] = TAG_IDS;

/** The text of a word id. An unknown value (for example an old custom value) stays as it is. */
export function wordLabel(id: string): string {
  return isWordId(id) ? contentText(`words.${id}`) : id;
}

/** The text of a tag id. The text of a custom tag is the tag itself. */
export function tagLabel(id: string): string {
  return isTagId(id) ? contentText(`tags.${id}.label`) : id;
}

/** "jen lehce" ... "hodně silně" for the intensity 1 to 5. */
export function intensityLabel(level: Intensity): string {
  return contentText(`intensity.${level}`);
}

export const WHO5_CADENCE_DAYS = 14;

/* ---------- recommendations ----------
   One source for the "Pro tebe" cards (Home) and the tip on the check-in confirmation; the tip
   follows the mood (`forMood`). */

export type RecommendationRoute = "/calm" | "/checkin" | "/stats" | "/help";
export type RecommendationId = "dech-478" | "denik" | "usinani" | "prochazka";

export interface Recommendation {
  id: RecommendationId;
  icon: IconName;
  /** The tone of the icon tile (soft fill and strong hue; works in light and dark). */
  tone?: Tone;
  readonly title: string;
  readonly subtitle: string;
  readonly badge: [BadgeTone, string] | null;
  route: RecommendationRoute;
  forMood?: MoodId;
}

function recommendation(
  id: RecommendationId,
  data: Omit<Recommendation, "id" | "title" | "subtitle" | "badge"> & {
    badgeTone: BadgeTone | null;
  },
): Recommendation {
  const { badgeTone, ...rest } = data;
  return {
    id,
    ...rest,
    get title() {
      return contentText(`recommendations.${id}.title`);
    },
    get subtitle() {
      return contentText(`recommendations.${id}.subtitle`);
    },
    get badge(): [BadgeTone, string] | null {
      const text = contentTextOrNull(`recommendations.${id}.badge`);
      return badgeTone && text ? [badgeTone, text] : null;
    },
  };
}

export const RECOMMENDATIONS: Recommendation[] = [
  recommendation("dech-478", {
    icon: "wind",
    tone: "accent",
    badgeTone: "accent",
    route: "/calm",
    forMood: "napeti",
  }),
  recommendation("denik", {
    icon: "notebook-pen",
    tone: "positive",
    badgeTone: null,
    route: "/checkin",
    forMood: "energie",
  }),
  recommendation("usinani", {
    icon: "moon",
    tone: "lilac",
    badgeTone: "lilac",
    route: "/calm",
    forMood: "utlum",
  }),
  recommendation("prochazka", {
    icon: "footprints",
    tone: "positive",
    badgeTone: "positive",
    route: "/calm",
    forMood: "klid",
  }),
];

/** The tip for a mood (check-in confirmation); without a match, the tip for tension. */
export function recommendationForMood(mood: MoodId): Recommendation {
  return RECOMMENDATIONS.find((r) => r.forMood === mood) ?? RECOMMENDATIONS[0];
}

/* ---------- date and time ---------- */

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/** "Po" ... "Ne", Monday first (the product shows the week from Monday in every locale). */
export function weekdayLetters(): string[] {
  return WEEKDAY_KEYS.map((key) => i18n.t(`common:weekdays.short.${key}`));
}

/** "pondělí" ... "neděle", Monday first. */
export function weekdayNames(): string[] {
  return WEEKDAY_KEYS.map((key) => i18n.t(`common:weekdays.long.${key}`));
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** The local date as "YYYY-MM-DD" (an entry belongs to the day on the phone, not to UTC). */
export function toISODate(d: Date = new Date()): ISODate {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function nowTime(d: Date = new Date()): string {
  return `${d.getHours()}:${pad2(d.getMinutes())}`;
}

/** The kicker of the Home screen: "Pondělí 6. října". */
export function todayHeading(d: Date = new Date()): string {
  return formatDayHeading(d);
}

/** "Dobré ráno, Alex": morning before 10, afternoon before 18, evening after that. */
export function greeting(name: string, d: Date = new Date()): string {
  const h = d.getHours();
  const part = h < 10 ? "morning" : h < 18 ? "afternoon" : "evening";
  const word = i18n.t(`common:greeting.${part}`);
  return name ? i18n.t("common:greeting.withName", { greeting: word, name }) : word;
}

/** The number of days between two ISO dates (b minus a), measured at noon because of the changes of daylight time. */
export function daysBetween(aISO: ISODate, bISO: ISODate): number {
  const at = new Date(`${aISO}T12:00:00`).getTime();
  const bt = new Date(`${bISO}T12:00:00`).getTime();
  return Math.round((bt - at) / 86400000);
}

/* ---------- aggregation of entries ---------- */

/** The entries of one day as { mood, intensity } or null.
    The mood is the most frequent one (a tie goes to the later entry); the intensity is the average. */
export function aggregateDay(dayEntries: Entry[]): DayAggregate | null {
  if (!dayEntries.length) return null;
  const counts: Partial<Record<MoodId, number>> = {};
  for (const e of dayEntries) counts[e.mood] = (counts[e.mood] ?? 0) + 1;
  const max = Math.max(...Object.values(counts));
  let mood: MoodId = dayEntries[0].mood;
  for (const e of dayEntries) if (counts[e.mood] === max) mood = e.mood; // the last one with the maximum wins
  const avg = dayEntries.reduce((s, e) => s + e.intensity, 0) / dayEntries.length;
  const intensity = Math.min(5, Math.max(1, Math.round(avg))) as Intensity; // the clamp keeps 1 to 5
  return { mood, intensity };
}

function mondayOf(d: Date): Date {
  const m = new Date(d);
  m.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return m;
}

/** The current week (Monday to Sunday) with the aggregated entries. */
export function buildWeek(entries: Entry[], today: Date = new Date()): WeekDay[] {
  const todayIdx = (today.getDay() + 6) % 7;
  const monday = mondayOf(today);
  const names = weekdayNames();
  return weekdayLetters().map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = toISODate(d);
    const entry = aggregateDay(entries.filter((e) => e.date === iso));
    return {
      label,
      dayName: names[i],
      iso,
      entry,
      today: i === todayIdx,
      future: i > todayIdx,
    };
  });
}

/** The last 4 calendar weeks (the oldest first), for the month view. */
export function buildMonth(entries: Entry[], today: Date = new Date()): MonthDay[][] {
  const monday = mondayOf(today);
  const todayISO = toISODate(today);
  const letters = weekdayLetters();
  return [3, 2, 1, 0].map((w) =>
    letters.map((label, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() - 7 * w + i);
      const iso = toISODate(d);
      return {
        label,
        iso,
        entry: aggregateDay(entries.filter((e) => e.date === iso)),
        future: iso > todayISO,
      };
    }),
  );
}

/** The last entry of a day (for the card on Home and the confirmation). */
export function lastEntryForDate(entries: Entry[], iso: ISODate): Entry | null {
  for (let i = entries.length - 1; i >= 0; i--) if (entries[i].date === iso) return entries[i];
  return null;
}

/** The number of entries in the current week; an "empty week" has 0 or 1 entries. */
export function weekEntryCount(entries: Entry[], today: Date = new Date()): number {
  const week = buildWeek(entries, today);
  const days = new Set(week.map((d) => d.iso));
  return entries.filter((e) => days.has(e.date)).length;
}

/* ---------- WHO-5 wellbeing index ---------- */

export function latestWho5(who5: Who5Measurement[] | null | undefined): Who5Measurement | null {
  return who5 && who5.length ? who5[who5.length - 1] : null;
}

/** The interpretation on Home: always against the own average, never against other people. */
export function who5HomeText(who5: Who5Measurement[]): string | null {
  const cur = latestWho5(who5);
  if (!cur) return null;
  const prev = who5.slice(0, -1);
  if (!prev.length) return i18n.t("home:wellbeing.baseline");
  const avg = prev.reduce((s, m) => s + m.score, 0) / prev.length;
  return cur.score >= avg
    ? i18n.t("home:wellbeing.aboveAverage")
    : i18n.t("home:wellbeing.belowAverage");
}

/** The text in the overviews: when the last measurement was and when the next one is (cadence 14 days). */
export function who5StatsText(who5: Who5Measurement[], today: Date = new Date()): string | null {
  const cur = latestWho5(who5);
  if (!cur) return null;
  const since = Math.max(0, daysBetween(cur.date, toISODate(today)));
  const filled =
    since === 0
      ? i18n.t("stats:who5.filledToday")
      : i18n.t("stats:who5.filledAgo", { count: since });
  const left = Math.max(0, WHO5_CADENCE_DAYS - since);
  const next =
    left === 0 ? i18n.t("stats:who5.nextToday") : i18n.t("stats:who5.nextIn", { count: left });
  return `${filled} ${next}`;
}
