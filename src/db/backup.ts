/* Záloha: export celé databáze do JSON souboru a zpětný import s náhledem
   a slučováním podle id (žádné duplicity, nic se nepřepisuje).
   Pozor: exportovaný soubor už NENÍ šifrovaný — UI na to upozorňuje.
   Klíč databáze se nikdy neexportuje. */
import { count } from "drizzle-orm";
import { entries as entriesTable, measurements as measurementsTable } from "./schema";
import {
  insertEntry,
  insertMeasurement,
  listEntries,
  listMeasurements,
  readProfile,
  type Measurement,
} from "./repo";
import type { LumiDb } from "./types";
import type { AgeBand, Entry, Intensity, ISODate, MoodId } from "../model";

export const BACKUP_VERSION = 1 as const;

export interface BackupV1 {
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  entries: Entry[];
  measurements: Measurement[];
  /* bez `onboarded` (vázané na zařízení) a samozřejmě bez šifrovacího klíče */
  settings: { name: string; age: AgeBand | null; share: boolean };
}

export function buildBackup(db: LumiDb, now: Date = new Date()): BackupV1 {
  const { name, age, share } = readProfile(db);
  return {
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    entries: listEntries(db),
    measurements: [
      ...listMeasurements(db, "who5"),
      ...listMeasurements(db, "phq9"),
      ...listMeasurements(db, "gad7"),
    ],
    settings: { name, age, share },
  };
}

const MOOD_IDS = new Set(["energie", "napeti", "klid", "utlum"]);
const MEASUREMENT_TYPES = new Set(["who5", "phq9", "gad7"]);

function asEntry(e: unknown): Entry | null {
  if (!e || typeof e !== "object") return null;
  const x = e as Partial<Entry>;
  if (
    typeof x.id !== "string" ||
    typeof x.date !== "string" ||
    typeof x.mood !== "string" ||
    !MOOD_IDS.has(x.mood) ||
    typeof x.intensity !== "number"
  )
    return null;
  return {
    id: x.id,
    date: x.date,
    time: typeof x.time === "string" ? x.time : "0:00",
    mood: x.mood as MoodId,
    intensity: Math.min(5, Math.max(1, Math.round(x.intensity))) as Intensity,
    words: Array.isArray(x.words) ? x.words.filter((w) => typeof w === "string") : [],
    tags: Array.isArray(x.tags) ? x.tags.filter((t) => typeof t === "string") : [],
    note: typeof x.note === "string" ? x.note : "",
  };
}

function asMeasurement(m: unknown): Measurement | null {
  if (!m || typeof m !== "object") return null;
  const x = m as Partial<Measurement>;
  if (
    typeof x.id !== "string" ||
    typeof x.type !== "string" ||
    !MEASUREMENT_TYPES.has(x.type) ||
    typeof x.score !== "number" ||
    typeof x.date !== "string"
  )
    return null;
  return {
    id: x.id,
    type: x.type,
    score: x.score,
    date: x.date,
    answers: Array.isArray(x.answers) ? x.answers.filter((a) => typeof a === "number") : [],
  };
}

export interface BackupPreview {
  entryCount: number;
  measurementCount: number;
  from: ISODate | null;
  to: ISODate | null;
}

export type ParseResult =
  | { ok: true; backup: BackupV1; preview: BackupPreview }
  | { ok: false; reason: "invalid-json" | "not-a-backup" | "unknown-version" };

export function parseBackup(json: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, reason: "invalid-json" };
  }
  if (!parsed || typeof parsed !== "object" || !("version" in parsed))
    return { ok: false, reason: "not-a-backup" };
  const raw = parsed as Partial<BackupV1>;
  if (raw.version !== BACKUP_VERSION) return { ok: false, reason: "unknown-version" };

  const entries = Array.isArray(raw.entries)
    ? raw.entries.map(asEntry).filter((e): e is Entry => e !== null)
    : [];
  const measurements = Array.isArray(raw.measurements)
    ? raw.measurements.map(asMeasurement).filter((m): m is Measurement => m !== null)
    : [];
  const s: Partial<BackupV1["settings"]> =
    raw.settings && typeof raw.settings === "object" ? raw.settings : {};
  const backup: BackupV1 = {
    version: BACKUP_VERSION,
    exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : "",
    entries,
    measurements,
    settings: {
      name: typeof s.name === "string" ? s.name : "",
      age: s.age === "u26" || s.age === "plus27" ? s.age : null,
      share: typeof s.share === "boolean" ? s.share : false,
    },
  };
  const dates = entries.map((e) => e.date).sort();
  return {
    ok: true,
    backup,
    preview: {
      entryCount: entries.length,
      measurementCount: measurements.length,
      from: dates[0] ?? null,
      to: dates[dates.length - 1] ?? null,
    },
  };
}

export interface ImportResult {
  addedEntries: number;
  addedMeasurements: number;
}

/** Sloučení podle id: existující řádky zůstávají, nic se nepřepisuje. */
export function importBackup(db: LumiDb, backup: BackupV1): ImportResult {
  const countAll = () => ({
    e: db.select({ n: count() }).from(entriesTable).get()?.n ?? 0,
    m: db.select({ n: count() }).from(measurementsTable).get()?.n ?? 0,
  });
  const before = countAll();
  for (const entry of backup.entries) insertEntry(db, entry);
  for (const m of backup.measurements) insertMeasurement(db, m);
  const after = countAll();
  return { addedEntries: after.e - before.e, addedMeasurements: after.m - before.m };
}
