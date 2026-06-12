/* Lumi — profil a preference aplikace (jméno, věkové pásmo, sdílení,
   onboarded). Drží se v paměti a zapisují do settings tabulky šifrované
   SQLite (viz src/db) — žádný backend, žádná telemetrie. Záznamy a měření
   ve storu nejsou: čtou se hooky useEntries/useMeasurements ze src/db/hooks.
   Navigaci vlastní expo-router — nikdy se nepersistuje. */
import React from "react";
import { DEFAULT_PROFILE, readProfile, writeProfile, type ProfileSettings } from "./db/repo";
import { useDb } from "./db/provider";

export type AppState = ProfileSettings;
export const DEFAULT_STATE: AppState = DEFAULT_PROFILE;

export type PatchState = (p: Partial<AppState>) => void;

interface AppStore {
  state: AppState;
  patch: PatchState;
}

const AppStateContext = React.createContext<AppStore | null>(null);

/** Profil pro celý strom; čte se synchronně z DB (DbProvider už ji otevřel). */
export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const db = useDb();
  const [state, setState] = React.useState<AppState>(() => readProfile(db));
  const patch = React.useCallback<PatchState>(
    (p) => {
      writeProfile(db, p); // zápis nejdřív do DB, pak do paměti
      setState((s) => ({ ...s, ...p }));
    },
    [db],
  );
  const value = React.useMemo(() => ({ state, patch }), [state, patch]);
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppStore(): AppStore {
  const ctx = React.useContext(AppStateContext);
  if (!ctx) throw new Error("useAppStore musí být uvnitř <AppStateProvider>.");
  return ctx;
}

export function newEntryId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
