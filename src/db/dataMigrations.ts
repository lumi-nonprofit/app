/* Data migrations: changes of stored values that the SQL migrations in drizzle/ do not cover.
   `runDataMigrations` runs after the SQL migrations, in the app (src/db/connect.ts) and in the
   tests (test/helpers/testDb.ts). The `settings` key `data-version` records the last migration
   that ran, so every migration runs once. A migration must be safe to run twice. */
import { eq } from "drizzle-orm";
import { entries } from "./schema";
import { getSetting, setSetting } from "./repo";
import type { LumiDb } from "./types";
import { normalizeTags, normalizeWords } from "./vocab";

export const DATA_VERSION_KEY = "data-version";
export const CURRENT_DATA_VERSION = 1;

/** Version 1 (2026-10-18): the words and tags of an entry are ids, not Czech text. */
function migrateVocabularyToIds(db: LumiDb): void {
  const rows = db
    .select({ id: entries.id, words: entries.words, tags: entries.tags })
    .from(entries)
    .all();
  for (const row of rows) {
    const words = normalizeWords(row.words);
    const tags = normalizeTags(row.tags);
    const changed =
      words.some((w, i) => w !== row.words[i]) || tags.some((t, i) => t !== row.tags[i]);
    if (changed) db.update(entries).set({ words, tags }).where(eq(entries.id, row.id)).run();
  }
}

export function readDataVersion(db: LumiDb): number {
  const value = getSetting<number>(db, DATA_VERSION_KEY);
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Runs every data migration that the database has not seen yet. */
export function runDataMigrations(db: LumiDb): void {
  const version = readDataVersion(db);
  if (version >= CURRENT_DATA_VERSION) return;
  db.transaction((tx) => {
    if (version < 1) migrateVocabularyToIds(tx as unknown as LumiDb);
    setSetting(tx as unknown as LumiDb, DATA_VERSION_KEY, CURRENT_DATA_VERSION);
  });
}
