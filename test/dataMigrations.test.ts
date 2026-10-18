/* The data migration of 2026-10-18: the words and the tags of an entry become ids. The
   migration runs once per database, it keeps unknown values (custom tags) and old backups
   import with ids. */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "../src/db/schema";
import { entries } from "../src/db/schema";
import type { LumiDb } from "../src/db/types";
import { CURRENT_DATA_VERSION, readDataVersion, runDataMigrations } from "../src/db/dataMigrations";
import { importBackup, parseBackup } from "../src/db/backup";
import { listEntries } from "../src/db/repo";
import { normalizeTags, normalizeWords } from "../src/db/vocab";
import { createTestDb } from "./helpers/testDb";

/** A database without the data migrations, as a phone from before 2026-10-18 has it. */
function createLegacyDb(): LumiDb {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "drizzle" });
  return db as unknown as LumiDb;
}

const legacyEntry = (id: string, words: string[], tags: string[]) => ({
  id,
  date: "2026-06-12",
  time: "9:00",
  mood: "napeti",
  intensity: 3,
  words,
  tags,
  note: "",
});

describe("vocabulary ids", () => {
  it("map the Czech text of built-in words and tags to ids and keep the rest", () => {
    expect(normalizeWords(["stres", "obavy", "stress", "vlastní slovo"])).toEqual([
      "stress",
      "worry",
      "stress",
      "vlastní slovo",
    ]);
    expect(normalizeTags(["škola", "terapie", "work"])).toEqual(["school", "terapie", "work"]);
  });
});

describe("runDataMigrations", () => {
  it("rewrites stored Czech words and tags once", () => {
    const db = createLegacyDb();
    db.insert(entries)
      .values([
        legacyEntry("a", ["stres", "obavy"], ["škola", "terapie"]),
        legacyEntry("b", ["radost"], []),
      ])
      .run();
    expect(readDataVersion(db)).toBe(0);

    runDataMigrations(db);
    expect(readDataVersion(db)).toBe(CURRENT_DATA_VERSION);
    const rows = Object.fromEntries(listEntries(db).map((e) => [e.id, e]));
    expect(rows.a.words).toEqual(["stress", "worry"]);
    expect(rows.a.tags).toEqual(["school", "terapie"]);
    expect(rows.b.words).toEqual(["joy"]);

    // A second run changes nothing.
    runDataMigrations(db);
    expect(readDataVersion(db)).toBe(CURRENT_DATA_VERSION);
    expect(listEntries(db).map((e) => e.words)).toEqual([["stress", "worry"], ["joy"]]);
  });

  it("marks a fresh database as current", () => {
    expect(readDataVersion(createTestDb())).toBe(CURRENT_DATA_VERSION);
  });
});

describe("backup import", () => {
  it("imports a version 1 backup with Czech labels as ids", () => {
    const db = createTestDb();
    const json = JSON.stringify({
      version: 1,
      exportedAt: "2026-06-15T10:00:00.000Z",
      entries: [legacyEntry("old", ["stres"], ["škola", "terapie"])],
      measurements: [],
      settings: { name: "", age: null, share: false },
    });
    const parsed = parseBackup(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.entries[0].words).toEqual(["stress"]);
    expect(parsed.backup.entries[0].tags).toEqual(["school", "terapie"]);
    expect(importBackup(db, parsed.backup)).toEqual({ addedEntries: 1, addedMeasurements: 0 });
    expect(listEntries(db)[0].tags).toEqual(["school", "terapie"]);
  });

  it("rejects an unknown version", () => {
    expect(parseBackup(JSON.stringify({ version: 3, entries: [] }))).toEqual({
      ok: false,
      reason: "unknown-version",
    });
  });
});
