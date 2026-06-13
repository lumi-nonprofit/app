/* DbProvider: otevře šifrovanou databázi (vč. Drizzle migrací) a do té doby
   nevykresluje nic (nativní splash zůstává). Verze dat řídí re-query hooků
   po zápisu. */
import React from "react";
import { connectDb } from "./connect";
import type { LumiDb } from "./types";

const DbContext = React.createContext<LumiDb | null>(null);

interface DbVersion {
  version: number;
  bump: () => void;
}

const DbVersionContext = React.createContext<DbVersion | null>(null);

export function DbProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = React.useState<LumiDb | null>(null);
  const [version, setVersion] = React.useState(0);
  React.useEffect(() => {
    let alive = true;
    connectDb()
      .then((d) => {
        if (alive) setDb(d);
      })
      .catch((err: unknown) => {
        // bez telemetrie: chyba zůstává jen v lokálním logu vývojáře
        console.error("Lumi: databázi se nepodařilo otevřít", err);
      });
    return () => {
      alive = false;
    };
  }, []);
  const bump = React.useCallback(() => setVersion((v) => v + 1), []);
  const versionValue = React.useMemo(() => ({ version, bump }), [version, bump]);
  if (!db) return null;
  return (
    <DbContext.Provider value={db}>
      <DbVersionContext.Provider value={versionValue}>{children}</DbVersionContext.Provider>
    </DbContext.Provider>
  );
}

export function useDb(): LumiDb {
  const db = React.useContext(DbContext);
  if (!db) throw new Error("useDb musí být uvnitř <DbProvider>.");
  return db;
}

export function useDbVersion(): DbVersion {
  const ctx = React.useContext(DbVersionContext);
  if (!ctx) throw new Error("useDbVersion musí být uvnitř <DbProvider>.");
  return ctx;
}
