/* Jednorázová migrace z AsyncStorage (klíč lumi-app-v1) do SQLite.
   Idempotentní: vkládá jen chybějící řádky (ON CONFLICT DO NOTHING),
   profil jen u klíčů, které v settings ještě nejsou, a AsyncStorage
   klíč smaže až po ověření počtů. Opakované spuštění nic nerozbije. */
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  countEntriesByIds,
  countMeasurementsByIds,
  existingProfileKeys,
  insertEntry,
  insertMeasurement,
  writeProfile,
  type ProfileSettings,
} from "./repo";
import type { LumiDb } from "./types";
import type { AgeBand, Entry, Intensity, MoodId, Who5Measurement } from "../model";

/** Klíč starého úložiště (AsyncStorage, do verze s expo-routerem). */
export const LEGACY_STORE_KEY = "lumi-app-v1";

export interface LegacyState {
  onboarded: boolean;
  name: string;
  age: AgeBand | null;
  share: boolean;
  entries: Entry[];
  who5: Who5Measurement[];
}

const MOOD_IDS = new Set(["energie", "napeti", "klid", "utlum"]);

function isLegacyEntry(e: unknown): e is Entry {
  if (!e || typeof e !== "object") return false;
  const x = e as Partial<Entry>;
  return (
    typeof x.id === "string" &&
    typeof x.date === "string" &&
    typeof x.mood === "string" &&
    MOOD_IDS.has(x.mood) &&
    typeof x.intensity === "number"
  );
}

/** Surový JSON ze starého úložiště → validní legacy stav (jen známé klíče;
    `route` z dob, kdy se persistovala navigace, se zahazuje). */
export function sanitizeLegacyState(raw: string | null): LegacyState {
  const st: LegacyState = {
    onboarded: false,
    name: "",
    age: null,
    share: false,
    entries: [],
    who5: [],
  };
  try {
    if (!raw) return st;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return st;
    const p = parsed as Partial<LegacyState>;
    return {
      onboarded: typeof p.onboarded === "boolean" ? p.onboarded : st.onboarded,
      name: typeof p.name === "string" ? p.name : st.name,
      age: p.age === "u26" || p.age === "plus27" ? p.age : st.age,
      share: typeof p.share === "boolean" ? p.share : st.share,
      entries: Array.isArray(p.entries)
        ? p.entries.filter(isLegacyEntry).map((e) => ({
            ...e,
            time: typeof e.time === "string" ? e.time : "0:00",
            intensity: Math.min(5, Math.max(1, Math.round(e.intensity))) as Intensity,
            mood: e.mood as MoodId,
            words: Array.isArray(e.words) ? e.words.filter((w) => typeof w === "string") : [],
            tags: Array.isArray(e.tags) ? e.tags.filter((t) => typeof t === "string") : [],
            note: typeof e.note === "string" ? e.note : "",
          }))
        : st.entries,
      who5: Array.isArray(p.who5)
        ? p.who5.filter(
            (m): m is Who5Measurement =>
              !!m &&
              typeof m === "object" &&
              typeof m.score === "number" &&
              typeof m.date === "string",
          )
        : st.who5,
    };
  } catch {
    /* poškozený storage → nic k migraci */
    return st;
  }
}

/** Deterministické id pro WHO-5 měření ze starého úložiště (idempotence). */
const legacyWho5Id = (m: Who5Measurement, i: number): string => `who5-legacy-${i}-${m.date}`;

export async function migrateLegacyStore(db: LumiDb): Promise<void> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(LEGACY_STORE_KEY);
  } catch {
    return; // storage nedostupný — zkusí se příště
  }
  if (!raw) return; // nic k migraci (čerstvá instalace nebo už hotovo)

  const legacy = sanitizeLegacyState(raw);

  for (const entry of legacy.entries) insertEntry(db, entry);
  legacy.who5.forEach((m, i) =>
    insertMeasurement(db, {
      id: legacyWho5Id(m, i),
      type: "who5",
      score: m.score,
      date: m.date,
      answers: [],
    }),
  );

  // profil: DB je po první migraci zdroj pravdy — nepřepisovat existující klíče
  const have = existingProfileKeys(db);
  const profilePatch: Partial<ProfileSettings> = {};
  if (!have.has("onboarded")) profilePatch.onboarded = legacy.onboarded;
  if (!have.has("name")) profilePatch.name = legacy.name;
  if (!have.has("age")) profilePatch.age = legacy.age;
  if (!have.has("share")) profilePatch.share = legacy.share;
  if (Object.keys(profilePatch).length) writeProfile(db, profilePatch);

  // ověř počty, teprve pak starý klíč smaž
  const entriesOk =
    countEntriesByIds(
      db,
      legacy.entries.map((e) => e.id),
    ) === legacy.entries.length;
  const who5Ok = countMeasurementsByIds(db, legacy.who5.map(legacyWho5Id)) === legacy.who5.length;
  if (entriesOk && who5Ok) {
    try {
      await AsyncStorage.removeItem(LEGACY_STORE_KEY);
    } catch {
      /* smazání se zopakuje při příštím startu — data už jsou v DB (idempotentní) */
    }
  }
}
