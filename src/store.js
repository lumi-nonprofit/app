/* Lumi — stav aplikace s persistencí v localStorage.
   Tvoje záznamy zůstávají jen v tomhle telefonu: žádný backend, žádná
   telemetrie. Sdílení pro výzkum je opt-in přepínač (default vypnuto)
   a zatím nic neodesílá — viz README. */
import React from "react";

export const STORE_KEY = "lumi-app-v1";

export const DEFAULT_STATE = {
  onboarded: false,
  name: "",
  age: null, // "u26" | "plus27" — určuje primární krizovou linku
  share: false, // anonymní sdílení pro výzkum, výhradně opt-in
  entries: [], // [{ id, date: "YYYY-MM-DD", time: "H:MM", mood, intensity, words, tags, note }]
  who5: [], // [{ score: 0–100, date: "YYYY-MM-DD" }] — dotazník zatím není, viz README
  route: "ob1",
};

const ROUTES = new Set(["ob1", "ob2", "ob3", "home", "calm", "checkin1", "checkin2", "confirm", "stats", "help"]);
const EPHEMERAL = new Set(["ob1", "ob2", "ob3", "checkin1", "checkin2", "confirm"]);

export function loadState() {
  let st = { ...DEFAULT_STATE };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) st = { ...st, ...JSON.parse(raw) };
  } catch {
    /* poškozený nebo nedostupný storage → čistý start */
  }
  // rozpracovaný check-in a onboarding nepřežijí reload — vrať se na pevnou obrazovku
  if (!ROUTES.has(st.route)) st.route = st.onboarded ? "home" : "ob1";
  else if (!st.onboarded) st.route = "ob1";
  else if (EPHEMERAL.has(st.route)) st.route = "home";
  return st;
}

export function useAppState() {
  const [st, setSt] = React.useState(loadState);
  React.useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(st));
    } catch {
      /* plný/nedostupný storage — aplikace běží dál bez persistence */
    }
  }, [st]);
  const patch = React.useCallback((p) => setSt((s) => ({ ...s, ...p })), []);
  return [st, patch];
}

export function newEntryId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
