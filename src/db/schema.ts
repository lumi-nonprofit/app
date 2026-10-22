/* Lumi: the schema of the encrypted SQLite database (Drizzle ORM).
   Emotional entries are a special category of personal data (Article 9 GDPR):
   SQLCipher encrypts the database, expo-secure-store holds the key.

   `words` and `tags` are JSON columns, not M:N tables: they always belong to one entry
   only, the app reads them with the whole entry, and the volumes are local (a few writes
   per day): a relational split would add only JOINs. The custom tags have their own table
   `tags` for the management (delete, the builtin flag), but the link to an entry stays a
   value in the JSON column. */
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const entries = sqliteTable(
  "entries",
  {
    id: text("id").primaryKey(),
    date: text("date").notNull(), // "YYYY-MM-DD" (the local day on the phone)
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
  key: text("key").primaryKey(), // the profile (name, age, share, onboarded) and the preferences
  value: text("value").notNull(), // a JSON-encoded value
});

export type EntryRow = typeof entries.$inferSelect;
export type MeasurementRow = typeof measurements.$inferSelect;
export type TagRow = typeof tags.$inferSelect;
export type SettingRow = typeof settings.$inferSelect;
