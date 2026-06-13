/* Krizový plán — tři krátké sekce, které si člověk sepíše v klidu a sáhne
   po nich, když je zle. Ukládá se do `settings` (getSetting/setSetting) po
   jednotlivých sekcích, ne jako celek — každá obrazovka řeší jen svou sekci.
   Obsah je čistě uživatelův; aplikace ho nikam neposílá ani nehodnotí. */
import { getSetting } from "../../db/repo";
import type { LumiDb } from "../../db/types";

export type PlanSectionId = "signals" | "helps" | "contacts";

/** Klíče v `settings` pro jednotlivé sekce plánu. */
export const PLAN_SECTION_KEYS: Record<PlanSectionId, string> = {
  signals: "crisis-plan-signals",
  helps: "crisis-plan-helps",
  contacts: "crisis-plan-contacts",
};

export interface PlanSectionMeta {
  id: PlanSectionId;
  title: string;
  subtitle: string;
  placeholder: string;
}

/* Pořadí = pořadí na kartě i v rozcestníku Pomoci. */
export const PLAN_SECTIONS: PlanSectionMeta[] = [
  {
    id: "signals",
    title: "Moje varovné signály",
    subtitle: "Podle čeho poznám, že se to horší",
    placeholder: "Třeba: nespavost, stažení se od lidí, …",
  },
  {
    id: "helps",
    title: "Co mi pomáhá",
    subtitle: "Ověřené kroky a činnosti",
    placeholder: "Třeba: zavolat kamarádce, projít se, dýchání 4-7-8",
  },
  {
    id: "contacts",
    title: "Na koho se obrátím",
    subtitle: "Blízcí lidé a kontakty",
    placeholder: "Jméno a telefon — na koho je fajn se obrátit",
  },
];

export const isPlanSectionId = (v: string | undefined): v is PlanSectionId =>
  v === "signals" || v === "helps" || v === "contacts";

export interface CrisisPlanContent {
  signals: string;
  helps: string;
  contacts: string;
}

/** Přečte celý plán z `settings` (chybějící sekce = prázdný řetězec). */
export function readPlan(db: LumiDb): CrisisPlanContent {
  return {
    signals: getSetting<string>(db, PLAN_SECTION_KEYS.signals) ?? "",
    helps: getSetting<string>(db, PLAN_SECTION_KEYS.helps) ?? "",
    contacts: getSetting<string>(db, PLAN_SECTION_KEYS.contacts) ?? "",
  };
}

/** True, když je plán úplně prázdný (všechny tři sekce jen bílé znaky). */
export function planIsEmpty(plan: CrisisPlanContent): boolean {
  return !plan.signals.trim() && !plan.helps.trim() && !plan.contacts.trim();
}
