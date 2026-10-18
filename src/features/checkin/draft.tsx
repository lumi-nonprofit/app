/* Rozpracovaný check-in — žije jen v paměti checkin stacku, nikdy se
   nepersistuje. Provider je v app/checkin/_layout: každé otevření modálu
   začíná s čistým draftem. `saved` vypne guard neuložených změn po zápisu. */
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
  /** Zápis je uložený — odchod ze sheetu už nic nezahazuje. */
  saved: boolean;
  markSaved: () => void;
}

const CheckinDraftContext = React.createContext<CheckinDraftStore | null>(null);

export function CheckinDraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setRaw] = React.useState<CheckinDraft>(EMPTY_DRAFT);
  const [saved, setSaved] = React.useState(false);
  const setDraft = React.useCallback(
    (p: Partial<CheckinDraft>) => setRaw((d) => ({ ...d, ...p })),
    [],
  );
  const markSaved = React.useCallback(() => setSaved(true), []);
  const value = React.useMemo(
    () => ({ draft, setDraft, saved, markSaved }),
    [draft, setDraft, saved, markSaved],
  );
  return <CheckinDraftContext.Provider value={value}>{children}</CheckinDraftContext.Provider>;
}

/** Je v draftu něco, co by zavření sheetu zahodilo? */
export function isDraftDirty(draft: CheckinDraft): boolean {
  return (
    draft.mood !== null ||
    draft.words.length > 0 ||
    draft.tags.length > 0 ||
    draft.note.trim().length > 0
  );
}

export function useCheckinDraft(): CheckinDraftStore {
  const ctx = React.useContext(CheckinDraftContext);
  if (!ctx) throw new Error("useCheckinDraft musí být uvnitř <CheckinDraftProvider>.");
  return ctx;
}
