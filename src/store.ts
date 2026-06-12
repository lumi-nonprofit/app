/* Lumi — stav aplikace s persistencí v AsyncStorage.
   Tvoje záznamy zůstávají jen v tomhle telefonu: žádný backend, žádná
   telemetrie. Sdílení pro výzkum je opt-in přepínač (default vypnuto)
   a zatím nic neodesílá — viz README.
   AsyncStorage je asynchronní: useAppState vrací `null`, dokud se stav
   nenačte (App do té doby nic nevykresluje). */
import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AgeBand, Entry, Who5Measurement } from "./model";

export const STORE_KEY = "lumi-app-v1";

export type Route =
  | "ob1"
  | "ob2"
  | "ob3"
  | "home"
  | "calm"
  | "checkin1"
  | "checkin2"
  | "confirm"
  | "stats"
  | "help";

export interface AppState {
  onboarded: boolean;
  name: string;
  age: AgeBand | null; // určuje primární krizovou linku
  share: boolean; // anonymní sdílení pro výzkum, výhradně opt-in
  entries: Entry[];
  who5: Who5Measurement[]; // dotazník zatím není, viz README
  route: Route;
}

export const DEFAULT_STATE: AppState = {
  onboarded: false,
  name: "",
  age: null,
  share: false,
  entries: [],
  who5: [],
  route: "ob1",
};

const ROUTES = new Set<string>([
  "ob1",
  "ob2",
  "ob3",
  "home",
  "calm",
  "checkin1",
  "checkin2",
  "confirm",
  "stats",
  "help",
]);
const EPHEMERAL = new Set<string>(["ob1", "ob2", "ob3", "checkin1", "checkin2", "confirm"]);

/** Surový JSON ze storage → validní stav (poškozený/nedostupný → čistý start). */
export function sanitizeState(raw: string | null): AppState {
  let st: AppState = { ...DEFAULT_STATE };
  try {
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object") st = { ...st, ...(parsed as Partial<AppState>) };
    }
  } catch {
    /* poškozený storage → čistý start */
  }
  // rozpracovaný check-in a onboarding nepřežijí restart — vrať se na pevnou obrazovku
  if (!ROUTES.has(st.route)) st.route = st.onboarded ? "home" : "ob1";
  else if (!st.onboarded) st.route = "ob1";
  else if (EPHEMERAL.has(st.route)) st.route = "home";
  return st;
}

export function useAppState(): [AppState | null, (p: Partial<AppState>) => void] {
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
  const patch = React.useCallback(
    (p: Partial<AppState>) => setSt((s) => (s ? { ...s, ...p } : s)),
    [],
  );
  return [st, patch];
}

export function newEntryId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
