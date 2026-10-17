/* DbProvider: otevře šifrovanou databázi (vč. Drizzle migrací) a do té doby
   nevykresluje nic (nativní splash zůstává). Když otevření selže, vykreslí
   `fallback` (krizové linky nesmí záviset na databázi). Verze dat řídí
   re-query hooků po zápisu. */
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
  /** Obrazovka při selhání databáze (bez ní zůstane viditelný jen splash). */
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
        // S12: žádné citlivé logy v produkci. Klíč/PRAGMA/cesty se nelogují nikdy;
        // ani chybový objekt (může nést PRAGMA či cestu k souboru).
        // Rejection reason je záměrně ignorován (callback nemá parametr), aby se
        // omylem nelogovaly citlivé detaily. V dev buildu jen obecná zpráva.
        // Bez DB se vykreslí jen fallback (krizové linky), nikdy zbytek aplikace.
        if (__DEV__) console.error("Lumi: databázi se nepodařilo otevřít.");
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
  if (!db) throw new Error("useDb musí být uvnitř <DbProvider>.");
  return db;
}

export function useDbVersion(): DbVersion {
  const ctx = React.useContext(DbVersionContext);
  if (!ctx) throw new Error("useDbVersion musí být uvnitř <DbProvider>.");
  return ctx;
}
