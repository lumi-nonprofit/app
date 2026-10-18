/* The crisis plan: three short sections that a person writes in a calm moment and reads when
   things are bad. Each section is stored in `settings` (getSetting/setSetting) on its own, not
   as a whole: each screen handles one section. The content belongs to the user; the app does not
   send it anywhere and does not rate it. The titles come from the message catalog
   (content.json, key `planSections.<id>`). */
import { getSetting } from "../../db/repo";
import type { LumiDb } from "../../db/types";
import { contentText } from "../../i18n/content";

export type PlanSectionId = "signals" | "helps" | "contacts";

/** The `settings` keys of the sections. */
export const PLAN_SECTION_KEYS: Record<PlanSectionId, string> = {
  signals: "crisis-plan-signals",
  helps: "crisis-plan-helps",
  contacts: "crisis-plan-contacts",
};

export interface PlanSectionMeta {
  id: PlanSectionId;
  readonly title: string;
  readonly subtitle: string;
  readonly placeholder: string;
}

function section(id: PlanSectionId): PlanSectionMeta {
  return {
    id,
    get title() {
      return contentText(`planSections.${id}.title`);
    },
    get subtitle() {
      return contentText(`planSections.${id}.subtitle`);
    },
    get placeholder() {
      return contentText(`planSections.${id}.placeholder`);
    },
  };
}

/* The order is the order on the card and in the Help list. */
export const PLAN_SECTIONS: PlanSectionMeta[] = [
  section("signals"),
  section("helps"),
  section("contacts"),
];

export const isPlanSectionId = (v: string | undefined): v is PlanSectionId =>
  v === "signals" || v === "helps" || v === "contacts";

export interface CrisisPlanContent {
  signals: string;
  helps: string;
  contacts: string;
}

/** Reads the whole plan from `settings` (a missing section is an empty string). */
export function readPlan(db: LumiDb): CrisisPlanContent {
  return {
    signals: getSetting<string>(db, PLAN_SECTION_KEYS.signals) ?? "",
    helps: getSetting<string>(db, PLAN_SECTION_KEYS.helps) ?? "",
    contacts: getSetting<string>(db, PLAN_SECTION_KEYS.contacts) ?? "",
  };
}

/** True when the plan is empty (all three sections hold only white space). */
export function planIsEmpty(plan: CrisisPlanContent): boolean {
  return !plan.signals.trim() && !plan.helps.trim() && !plan.contacts.trim();
}
