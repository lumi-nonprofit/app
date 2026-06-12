/* Typový přístup k datům: zápis = INSERT (žádné přepisování celku),
   čtení = dotazy s volitelným rozsahem dat. Funkce berou `db` jako
   parametr — aplikace dodává expo-sqlite instanci, testy better-sqlite3. */
import { and, asc, count, eq, gte, inArray, lte } from "drizzle-orm";
import { entries, measurements, settings } from "./schema";
import type { LumiDb } from "./types";
import type { AgeBand, Entry, Intensity, ISODate, MoodId } from "../model";

/* ---------- záznamy ---------- */

export interface DateRange {
  from?: ISODate;
  to?: ISODate;
}

/* id začíná timestampem (Date.now()), takže řazení podle id = pořadí vzniku
   (lastEntryForDate spoléhá na to, že pozdější zápis je v poli později) */
export function listEntries(db: LumiDb, range?: DateRange): Entry[] {
  const conds = [
    ...(range?.from ? [gte(entries.date, range.from)] : []),
    ...(range?.to ? [lte(entries.date, range.to)] : []),
  ];
  const rows = db
    .select()
    .from(entries)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(entries.id))
    .all();
  // hranice DB → doména: mood/intensity se validují při zápisu
  return rows.map((r) => ({ ...r, mood: r.mood as MoodId, intensity: r.intensity as Intensity }));
}

export function insertEntry(db: LumiDb, entry: Entry): void {
  db.insert(entries).values(entry).onConflictDoNothing().run();
}

export function countEntriesByIds(db: LumiDb, ids: string[]): number {
  if (!ids.length) return 0;
  const row = db.select({ n: count() }).from(entries).where(inArray(entries.id, ids)).get();
  return row?.n ?? 0;
}

/* ---------- měření (WHO-5, PHQ-9, GAD-7) ---------- */

export type MeasurementType = "who5" | "phq9" | "gad7";

export interface Measurement {
  id: string;
  type: MeasurementType;
  score: number;
  date: ISODate;
  answers: number[];
}

export function listMeasurements(db: LumiDb, type: MeasurementType): Measurement[] {
  const rows = db
    .select()
    .from(measurements)
    .where(eq(measurements.type, type))
    .orderBy(asc(measurements.date), asc(measurements.id))
    .all();
  return rows.map((r) => ({ ...r, type: r.type as MeasurementType }));
}

export function insertMeasurement(db: LumiDb, m: Measurement): void {
  db.insert(measurements).values(m).onConflictDoNothing().run();
}

export function countMeasurementsByIds(db: LumiDb, ids: string[]): number {
  if (!ids.length) return 0;
  const row = db
    .select({ n: count() })
    .from(measurements)
    .where(inArray(measurements.id, ids))
    .get();
  return row?.n ?? 0;
}

/* ---------- profil a preference (settings tabulka) ---------- */

export interface ProfileSettings {
  onboarded: boolean;
  name: string;
  age: AgeBand | null; // určuje primární krizovou linku
  share: boolean; // anonymní sdílení pro výzkum, výhradně opt-in
}

export const DEFAULT_PROFILE: ProfileSettings = {
  onboarded: false,
  name: "",
  age: null,
  share: false,
};

export function readProfile(db: LumiDb): ProfileSettings {
  const rows = db.select().from(settings).all();
  const raw: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      raw[row.key] = JSON.parse(row.value);
    } catch {
      /* poškozená hodnota → výchozí */
    }
  }
  return {
    onboarded: typeof raw.onboarded === "boolean" ? raw.onboarded : DEFAULT_PROFILE.onboarded,
    name: typeof raw.name === "string" ? raw.name : DEFAULT_PROFILE.name,
    age: raw.age === "u26" || raw.age === "plus27" ? raw.age : DEFAULT_PROFILE.age,
    share: typeof raw.share === "boolean" ? raw.share : DEFAULT_PROFILE.share,
  };
}

export function writeProfile(db: LumiDb, patch: Partial<ProfileSettings>): void {
  for (const [key, value] of Object.entries(patch)) {
    const json = JSON.stringify(value ?? null);
    db.insert(settings)
      .values({ key, value: json })
      .onConflictDoUpdate({ target: settings.key, set: { value: json } })
      .run();
  }
}

/* ---------- obecné preference (settings mimo profil) ---------- */

export function getSetting<T>(db: LumiDb, key: string): T | null {
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  if (!row) return null;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return null;
  }
}

export function setSetting(db: LumiDb, key: string, value: unknown): void {
  const json = JSON.stringify(value ?? null);
  db.insert(settings)
    .values({ key, value: json })
    .onConflictDoUpdate({ target: settings.key, set: { value: json } })
    .run();
}

export function newMeasurementId(type: MeasurementType): string {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Které profilové klíče už v settings existují (kvůli idempotentní migraci). */
export function existingProfileKeys(db: LumiDb): Set<string> {
  return new Set(
    db
      .select({ key: settings.key })
      .from(settings)
      .all()
      .map((r) => r.key),
  );
}
