/* Lumi — stav aplikace s persistencí v AsyncStorage.
   Tvoje záznamy zůstávají jen v tomhle telefonu: žádný backend, žádná
   telemetrie. Sdílení pro výzkum je opt-in přepínač (default vypnuto)
   a zatím nic neodesílá — viz README.
   AsyncStorage je asynchronní: AppStateProvider nevykresluje nic, dokud
   se stav nenačte (nativní splash zůstává).
   Navigaci vlastní expo-router — `route` se nepersistuje. */
import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AgeBand, Entry, Who5Measurement } from "./model";

export const STORE_KEY = "lumi-app-v1";

export interface AppState {
  onboarded: boolean;
  name: string;
  age: AgeBand | null; // určuje primární krizovou linku
  share: boolean; // anonymní sdílení pro výzkum, výhradně opt-in
  entries: Entry[];
  who5: Who5Measurement[];
}

export const DEFAULT_STATE: AppState = {
  onboarded: false,
  name: "",
  age: null,
  share: false,
  entries: [],
  who5: [],
};

/** Surový JSON ze storage → validní stav (poškozený/nedostupný → čistý start).
    Bere jen známé klíče — starší verze persistovaly i `route`, ta při dalším
    uložení ze storage zmizí. */
export function sanitizeState(raw: string | null): AppState {
  const st: AppState = { ...DEFAULT_STATE };
  try {
    if (!raw) return st;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return st;
    const p = parsed as Partial<AppState>;
    return {
      onboarded: typeof p.onboarded === "boolean" ? p.onboarded : st.onboarded,
      name: typeof p.name === "string" ? p.name : st.name,
      age: p.age === "u26" || p.age === "plus27" ? p.age : st.age,
      share: typeof p.share === "boolean" ? p.share : st.share,
      entries: Array.isArray(p.entries) ? p.entries : st.entries,
      who5: Array.isArray(p.who5) ? p.who5 : st.who5,
    };
  } catch {
    /* poškozený storage → čistý start */
    return st;
  }
}

export type PatchState = (p: Partial<AppState>) => void;

export function useAppState(): [AppState | null, PatchState] {
  const [st, setSt] = React.useState<AppState | null>(null); // null = hydratuje se ze storage
  React.useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORE_KEY)
      .then((raw) => alive && setSt(sanitizeState(raw)))
      .catch(() => alive && setSt(sanitizeState(null)));
    return () => {
      alive = false;
    };
  }, []);
  React.useEffect(() => {
    if (!st) return;
    AsyncStorage.setItem(STORE_KEY, JSON.stringify(st)).catch(() => {
      /* plný/nedostupný storage — aplikace běží dál bez persistence */
    });
  }, [st]);
  const patch = React.useCallback<PatchState>((p) => setSt((s) => (s ? { ...s, ...p } : s)), []);
  return [st, patch];
}

interface AppStore {
  state: AppState;
  patch: PatchState;
}

const AppStateContext = React.createContext<AppStore | null>(null);

/** Hydratovaný stav pro celý strom; do načtení ze storage nevykresluje nic. */
export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [st, patch] = useAppState();
  const value = React.useMemo(() => (st ? { state: st, patch } : null), [st, patch]);
  if (!value) return null;
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
