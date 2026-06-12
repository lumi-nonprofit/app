/* Lumi — schéma šifrované SQLite databáze (Drizzle ORM).
   Emoční záznamy jsou zvláštní kategorie osobních údajů (čl. 9 GDPR) —
   databáze je šifrovaná SQLCipherem, klíč drží expo-secure-store.

   `words` a `tags` jsou JSON sloupce, ne M:N tabulky: vážou se vždy jen
   na jeden záznam, čtou se po celých záznamech a objemy jsou lokální
   (jednotky zápisů denně) — relační rozpad by přidal jen JOINy. Vlastní
   štítky mají vlastní tabulku `tags` kvůli správě (mazání, builtin flag),
   vazba na záznam ale zůstává hodnotou v JSON sloupci. */
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const entries = sqliteTable(
  "entries",
  {
    id: text("id").primaryKey(),
    date: text("date").notNull(), // "YYYY-MM-DD" (lokální den v telefonu)
    time: text("time").notNull(), // "H:MM"
    mood: text("mood").notNull(), // MoodId
    intensity: integer("intensity").notNull(), // 1–5
    words: text("words", { mode: "json" }).$type<string[]>().notNull().default([]),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([]),
    note: text("note").notNull().default(""),
  },
  (t) => [index("entries_date_idx").on(t.date)],
);

export const measurements = sqliteTable(
  "measurements",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(), // 'who5' | 'phq9' | 'gad7'
    score: integer("score").notNull(),
    date: text("date").notNull(), // "YYYY-MM-DD"
    answers: text("answers", { mode: "json" }).$type<number[]>().notNull().default([]),
  },
  (t) => [index("measurements_type_date_idx").on(t.type, t.date)],
);

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  label: text("label").notNull().unique(),
  builtin: integer("builtin", { mode: "boolean" }).notNull().default(false),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(), // profil (name, age, share, onboarded) a preference
  value: text("value").notNull(), // JSON-encoded hodnota
});

export type EntryRow = typeof entries.$inferSelect;
export type MeasurementRow = typeof measurements.$inferSelect;
export type TagRow = typeof tags.$inferSelect;
export type SettingRow = typeof settings.$inferSelect;
