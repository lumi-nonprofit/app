/* The React hooks over the database: a read recomputes after every write
   (the data version from DbProvider), a write = INSERT + a bump of the version. */
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
    void version; // a write raises the version → a forced re-query
    return listEntries(db, from || to ? { from, to } : undefined);
  }, [db, version, from, to]);
}

export function useMeasurements(type: MeasurementType): Measurement[] {
  const db = useDb();
  const { version } = useDbVersion();
  return React.useMemo(() => {
    void version; // a write raises the version → a forced re-query
    return listMeasurements(db, type);
  }, [db, version, type]);
}

/** A write to the DB that notifies the read hooks: write((db) => insertEntry(db, e)). */
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
