/* DbProvider: opens the encrypted database (with the Drizzle migrations) and renders
   nothing until then (the native splash stays). When the open fails, it renders
   `fallback` (the crisis lines must not depend on the database). The data version drives
   the re-query of the hooks after a write. */
import React from "react";
import { connectDb } from "./connect";
import type { LumiDb } from "./types";

const DbContext = React.createContext<LumiDb | null>(null);

interface DbVersion {
  version: number;
  bump: () => void;
}

const DbVersionContext = React.createContext<DbVersion | null>(null);

interface DbProviderProps {
  children: React.ReactNode;
  /** The screen on a database failure (without it only the splash stays visible). */
  fallback?: React.ReactNode;
}

export function DbProvider({ children, fallback }: DbProviderProps) {
  const [db, setDb] = React.useState<LumiDb | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [version, setVersion] = React.useState(0);
  React.useEffect(() => {
    let alive = true;
    connectDb()
      .then((d) => {
        if (alive) setDb(d);
      })
      .catch(() => {
        // S12: no sensitive logs in production. The key, the PRAGMA and the paths never go
        // to a log; neither does the error object (it can carry the PRAGMA or a file path).
        // The callback ignores the rejection reason on purpose (it has no parameter), so
        // that sensitive details never reach a log by accident. The dev build logs only a
        // general message. Without the DB only the fallback (the crisis lines) renders,
        // never the rest of the app.
        if (__DEV__) console.error("Lumi: the database did not open.");
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  const bump = React.useCallback(() => setVersion((v) => v + 1), []);
  const versionValue = React.useMemo(() => ({ version, bump }), [version, bump]);
  if (!db) return failed ? (fallback ?? null) : null;
  return (
    <DbContext.Provider value={db}>
      <DbVersionContext.Provider value={versionValue}>{children}</DbVersionContext.Provider>
    </DbContext.Provider>
  );
}

export function useDb(): LumiDb {
  const db = React.useContext(DbContext);
  if (!db) throw new Error("useDb must be inside <DbProvider>.");
  return db;
}

export function useDbVersion(): DbVersion {
  const ctx = React.useContext(DbVersionContext);
  if (!ctx) throw new Error("useDbVersion must be inside <DbProvider>.");
  return ctx;
}
