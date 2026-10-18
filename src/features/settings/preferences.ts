/* The preferences in the settings table (outside the profile): haptics. The appearance is not a
   setting: it follows the system (HIG Dark Mode, Android themes). */
import { getSetting, setSetting } from "../../db/repo";
import type { LumiDb } from "../../db/types";
import { haptics } from "../../lib/haptics";

export const HAPTICS_ENABLED_KEY = "haptics-enabled";

/** Reads the saved choice (on by default) and sets the haptics module. */
export function applyHapticsPreference(db: LumiDb): boolean {
  const enabled = getSetting<boolean>(db, HAPTICS_ENABLED_KEY) ?? true;
  haptics.setEnabled(enabled);
  return enabled;
}

export function saveHapticsPreference(db: LumiDb, enabled: boolean): void {
  setSetting(db, HAPTICS_ENABLED_KEY, enabled);
  haptics.setEnabled(enabled);
}
