/* Datová vrstva: schéma + repo funkce a záloha export → smazání → import
   = identická data. */
import { buildBackup, importBackup, parseBackup } from "../src/db/backup";
import {
  insertEntry,
  insertMeasurement,
  listEntries,
  listMeasurements,
  readProfile,
  writeProfile,
} from "../src/db/repo";
import { entries as entriesTable, measurements as measurementsTable } from "../src/db/schema";
import type { Entry } from "../src/model";
import { createTestDb } from "./helpers/testDb";

let seq = 0;
const entry = (e: Partial<Entry> & Pick<Entry, "mood" | "intensity">): Entry => ({
  id: `${1770000000000 + seq}-t${seq++}`,
  date: "2026-06-12",
  time: "9:00",
  words: [],
  tags: [],
  note: "",
  ...e,
});

describe("repo: záznamy a měření", () => {
  it("INSERT + čtení s rozsahem, řazení podle id (pořadí vzniku)", () => {
    const db = createTestDb();
    const a = entry({ mood: "klid", intensity: 2, date: "2026-06-10" });
    const b = entry({ mood: "napeti", intensity: 4, date: "2026-06-12", words: ["stres"] });
    const c = entry({ mood: "klid", intensity: 3, date: "2026-06-12" });
    insertEntry(db, b);
    insertEntry(db, a);
    insertEntry(db, c);

    expect(listEntries(db)).toHaveLength(3);
    expect(listEntries(db, { from: "2026-06-12" }).map((e) => e.id)).toEqual([b.id, c.id]);
    expect(listEntries(db, { to: "2026-06-10" })).toHaveLength(1);
    // duplicitní id se tiše ignoruje (merge sémantika)
    insertEntry(db, {
      ...a,
      note: "jiná",
      mood: "napeti",
      intensity: 5,
      words: ["prepsano"],
      tags: ["x"],
    });
    expect(listEntries(db)).toHaveLength(3);
    const originalA = listEntries(db, { to: "2026-06-10" }).find((e) => e.id === a.id)!;
    expect(originalA.note).toBe("");
    expect(originalA.mood).toBe("klid");
    expect(originalA.intensity).toBe(2);
    expect(originalA.words).toEqual([]);
    expect(originalA.tags).toEqual([]);
  });

  it("měření se filtrují podle typu a řadí podle data", () => {
    const db = createTestDb();
    insertMeasurement(db, { id: "m2", type: "who5", score: 72, date: "2026-06-10", answers: [] });
    insertMeasurement(db, {
      id: "m1",
      type: "who5",
      score: 48,
      date: "2026-05-27",
      answers: [2, 3, 1, 2, 4],
    });
    insertMeasurement(db, { id: "p1", type: "phq9", score: 4, date: "2026-06-10", answers: [] });

    const who5 = listMeasurements(db, "who5");
    expect(who5.map((m) => m.score)).toEqual([48, 72]);
    expect(who5[0].answers).toEqual([2, 3, 1, 2, 4]);
    expect(listMeasurements(db, "phq9")).toHaveLength(1);
    expect(listMeasurements(db, "gad7")).toHaveLength(0);
  });

  it("profil: defaulty, zápis po částech, neznámé hodnoty nepropadnou", () => {
    const db = createTestDb();
    expect(readProfile(db)).toEqual({ onboarded: false, name: "", age: null, share: false });
    writeProfile(db, { name: "Janko", age: "u26" });
    writeProfile(db, { onboarded: true });
    expect(readProfile(db)).toEqual({ onboarded: true, name: "Janko", age: "u26", share: false });
  });
});

describe("záloha", () => {
  it("export → smazání → import vrátí identická data", () => {
    const db = createTestDb();
    const e1 = entry({
      mood: "utlum",
      intensity: 3,
      words: ["únava"],
      tags: ["spánek"],
      note: "dlouhý den",
    });
    const e2 = entry({ mood: "energie", intensity: 5, date: "2026-06-11" });
    insertEntry(db, e1);
    insertEntry(db, e2);
    insertMeasurement(db, {
      id: "w1",
      type: "who5",
      score: 80,
      date: "2026-06-12",
      answers: [4, 4, 4, 4, 4],
    });
    writeProfile(db, { name: "Janko", age: "plus27", share: true, onboarded: true });

    const json = JSON.stringify(buildBackup(db, new Date("2026-06-12T20:00:00")));

    // „smazání“: čistá databáze
    const fresh = createTestDb();
    const parsed = parseBackup(json);
    if (!parsed.ok) throw new Error("záloha se nenačetla");
    expect(parsed.preview).toEqual({
      entryCount: 2,
      measurementCount: 1,
      from: "2026-06-11",
      to: "2026-06-12",
    });

    const result = importBackup(fresh, parsed.backup);
    expect(result).toEqual({ addedEntries: 2, addedMeasurements: 1 });
    expect(listEntries(fresh)).toEqual(listEntries(db));
    expect(listMeasurements(fresh, "who5")).toEqual(listMeasurements(db, "who5"));

    // merge bez duplicit: druhý import nepřidá nic
    expect(importBackup(fresh, parsed.backup)).toEqual({ addedEntries: 0, addedMeasurements: 0 });
  });

  it("v záloze není šifrovací klíč ani onboarded", () => {
    const db = createTestDb();
    writeProfile(db, { name: "Janko", onboarded: true });
    const backup = buildBackup(db);
    expect(backup.settings).toEqual({ name: "Janko", age: null, share: false });
    expect(JSON.stringify(backup)).not.toMatch(/key|klíč/i);
  });

  it("nevalidní soubor se odmítne srozumitelně", () => {
    expect(parseBackup("tohle není json")).toEqual({ ok: false, reason: "invalid-json" });
    expect(parseBackup("{}")).toEqual({ ok: false, reason: "not-a-backup" });
    expect(parseBackup('{"version": 99}')).toEqual({ ok: false, reason: "unknown-version" });
  });

  it("DB tabulky jdou vyprázdnit a import je obnoví (smoke pro schéma)", () => {
    const db = createTestDb();
    insertEntry(db, entry({ mood: "klid", intensity: 1 }));
    insertMeasurement(db, { id: "w1", type: "who5", score: 50, date: "2026-06-12", answers: [] });
    const json = JSON.stringify(buildBackup(db));
    db.delete(entriesTable).run();
    db.delete(measurementsTable).run();
    expect(listEntries(db)).toEqual([]);
    const parsed = parseBackup(json);
    if (!parsed.ok) throw new Error("záloha se nenačetla");
    importBackup(db, parsed.backup);
    expect(listEntries(db)).toHaveLength(1);
    expect(listMeasurements(db, "who5")).toHaveLength(1);
  });
});
