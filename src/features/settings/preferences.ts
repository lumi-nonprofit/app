/* Preference uložené v settings tabulce (mimo profil): haptika. Vzhled se
   NEnastavuje — sleduje systém (HIG Dark Mode / Android themes). */
import { getSetting, setSetting } from "../../db/repo";
import type { LumiDb } from "../../db/types";
import { haptics } from "../../lib/haptics";

export const HAPTICS_ENABLED_KEY = "haptics-enabled";

/** Přečte uloženou volbu (výchozí zapnuto) a nastaví modul haptiky. */
export function applyHapticsPreference(db: LumiDb): boolean {
  const enabled = getSetting<boolean>(db, HAPTICS_ENABLED_KEY) ?? true;
  haptics.setEnabled(enabled);
  return enabled;
}

export function saveHapticsPreference(db: LumiDb, enabled: boolean): void {
  setSetting(db, HAPTICS_ENABLED_KEY, enabled);
  haptics.setEnabled(enabled);
}
