/* The vocabulary of a check-in: the words of each mood and the context tags. The database
   stores ids (ASCII, English). The catalogs hold the text (src/i18n/locales/<locale>/content.json,
   keys `words.<id>` and `tags.<id>.label`). The database stores the custom tags as typed.

   Before 2026-10-18 the database stored the Czech display text. `normalizeWords` and
   `normalizeTags` map that text to ids; src/db/dataMigrations.ts runs them once per database,
   and src/db/backup.ts runs them on import. */
import type { MoodId } from "../model";

export type WordId =
  | "enthusiasm"
  | "joy"
  | "playfulness"
  | "determination"
  | "curiosity"
  | "gratitude"
  | "pride"
  | "stress"
  | "nervousness"
  | "overwhelm"
  | "irritation"
  | "anger"
  | "worry"
  | "restlessness"
  | "ease"
  | "contentment"
  | "relaxation"
  | "balance"
  | "safety"
  | "focus"
  | "tenderness"
  | "tiredness"
  | "sadness"
  | "loneliness"
  | "emptiness"
  | "disappointment"
  | "longing"
  | "apathy";

export type TagId = "work" | "school" | "family" | "relationships" | "sleep" | "health" | "weather";

/** The words of each mood, in the order of the chips. */
export const WORD_IDS: Record<MoodId, readonly WordId[]> = {
  energie: ["enthusiasm", "joy", "playfulness", "determination", "curiosity", "gratitude", "pride"],
  napeti: ["stress", "nervousness", "overwhelm", "irritation", "anger", "worry", "restlessness"],
  klid: ["ease", "contentment", "relaxation", "balance", "safety", "focus", "tenderness"],
  utlum: ["tiredness", "sadness", "loneliness", "emptiness", "disappointment", "longing", "apathy"],
};

export const ALL_WORD_IDS: readonly WordId[] = Object.values(WORD_IDS).flat();

/** The built-in context tags, in the order of the chips. */
export const TAG_IDS: readonly TagId[] = [
  "work",
  "school",
  "family",
  "relationships",
  "sleep",
  "health",
  "weather",
];

/* The Czech text that the database stored before the ids. The app never shows these strings. */
const LEGACY_WORD_LABELS: Record<string, WordId> = {
  nadšení: "enthusiasm",
  radost: "joy",
  hravost: "playfulness",
  odhodlání: "determination",
  zvědavost: "curiosity",
  vděčnost: "gratitude",
  hrdost: "pride",
  stres: "stress",
  nervozita: "nervousness",
  zahlcení: "overwhelm",
  podráždění: "irritation",
  vztek: "anger",
  obavy: "worry",
  neklid: "restlessness",
  pohoda: "ease",
  spokojenost: "contentment",
  uvolnění: "relaxation",
  vyrovnanost: "balance",
  bezpečí: "safety",
  soustředění: "focus",
  něha: "tenderness",
  únava: "tiredness",
  smutek: "sadness",
  osamělost: "loneliness",
  prázdnota: "emptiness",
  zklamání: "disappointment",
  stesk: "longing",
  apatie: "apathy",
};

const LEGACY_TAG_LABELS: Record<string, TagId> = {
  práce: "work",
  škola: "school",
  rodina: "family",
  vztahy: "relationships",
  spánek: "sleep",
  zdraví: "health",
  počasí: "weather",
};

export const isWordId = (value: string): value is WordId =>
  (ALL_WORD_IDS as readonly string[]).includes(value);

export const isTagId = (value: string): value is TagId =>
  (TAG_IDS as readonly string[]).includes(value);

/** Maps the Czech text of a built-in word to its id. Ids and unknown values stay as they are. */
export function normalizeWord(value: string): string {
  return LEGACY_WORD_LABELS[value] ?? value;
}

/** Maps the Czech text of a built-in tag to its id. Ids and custom tags stay as they are. */
export function normalizeTag(value: string): string {
  return LEGACY_TAG_LABELS[value] ?? value;
}

export const normalizeWords = (values: string[]): string[] => values.map(normalizeWord);
export const normalizeTags = (values: string[]): string[] => values.map(normalizeTag);
