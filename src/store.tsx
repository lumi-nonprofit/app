/* Lumi: the profile and the preferences of the app (name, age band, share, onboarded). They
   live in memory and go to the settings table of the encrypted SQLite (see src/db): no backend,
   no telemetry. Entries and measurements are not in the store: the hooks useEntries and
   useMeasurements in src/db/hooks read them. expo-router owns the navigation and never
   persists it. */
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

/** The profile for the whole tree; it reads synchronously from the DB (DbProvider has opened it). */
export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const db = useDb();
  const [state, setState] = React.useState<AppState>(() => readProfile(db));
  const patch = React.useCallback<PatchState>(
    (p) => {
      writeProfile(db, p); // First the DB, then the memory.
      setState((s) => ({ ...s, ...p }));
    },
    [db],
  );
  const value = React.useMemo(() => ({ state, patch }), [state, patch]);
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppStore(): AppStore {
  const ctx = React.useContext(AppStateContext);
  if (!ctx) throw new Error("useAppStore must be used inside <AppStateProvider>.");
  return ctx;
}

export function newEntryId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
