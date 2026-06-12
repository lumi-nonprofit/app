/* Rozpracovaný check-in — žije jen v paměti checkin stacku, nikdy se
   nepersistuje. Provider je v app/checkin/_layout: každé otevření modálu
   začíná s čistým draftem. */
import React from "react";
import type { CheckinDraft } from "../../model";

export const EMPTY_DRAFT: CheckinDraft = {
  mood: null,
  intensity: 3,
  words: [],
  tags: [],
  note: "",
};

interface CheckinDraftStore {
  draft: CheckinDraft;
  setDraft: (p: Partial<CheckinDraft>) => void;
}

const CheckinDraftContext = React.createContext<CheckinDraftStore | null>(null);

export function CheckinDraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setRaw] = React.useState<CheckinDraft>(EMPTY_DRAFT);
  const setDraft = React.useCallback(
    (p: Partial<CheckinDraft>) => setRaw((d) => ({ ...d, ...p })),
    [],
  );
  const value = React.useMemo(() => ({ draft, setDraft }), [draft, setDraft]);
  return <CheckinDraftContext.Provider value={value}>{children}</CheckinDraftContext.Provider>;
}

export function useCheckinDraft(): CheckinDraftStore {
  const ctx = React.useContext(CheckinDraftContext);
  if (!ctx) throw new Error("useCheckinDraft musí být uvnitř <CheckinDraftProvider>.");
  return ctx;
}
