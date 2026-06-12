/* React hooky nad databází: čtení se přepočítá po každém zápisu
   (verze dat z DbProvideru), zápis = INSERT + bump verze. */
import React from "react";
import { useDb, useDbVersion } from "./provider";
import {
  listEntries,
  listMeasurements,
  type DateRange,
  type Measurement,
  type MeasurementType,
} from "./repo";
import type { LumiDb } from "./types";
import type { Entry } from "../model";

export function useEntries(range?: DateRange): Entry[] {
  const db = useDb();
  const { version } = useDbVersion();
  const { from, to } = range ?? {};
  return React.useMemo(() => {
    void version; // zápis zvyšuje verzi → vynucený re-query
    return listEntries(db, from || to ? { from, to } : undefined);
  }, [db, version, from, to]);
}

export function useMeasurements(type: MeasurementType): Measurement[] {
  const db = useDb();
  const { version } = useDbVersion();
  return React.useMemo(() => {
    void version; // zápis zvyšuje verzi → vynucený re-query
    return listMeasurements(db, type);
  }, [db, version, type]);
}

/** Zápis do DB s notifikací čtecích hooků: write((db) => insertEntry(db, e)). */
export function useDbWriter(): <T>(fn: (db: LumiDb) => T) => T {
  const db = useDb();
  const { bump } = useDbVersion();
  return React.useCallback(
    <T>(fn: (db: LumiDb) => T): T => {
      const result = fn(db);
      bump();
      return result;
    },
    [db, bump],
  );
}
