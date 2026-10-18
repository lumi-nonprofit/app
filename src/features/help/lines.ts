/* Crisis and support lines: the single data source for Help (the contact list), the emergency
   numbers, the primary line by age, the crisis card and the handover screen. The numbers are
   data; the names and the descriptions come from the message catalog (content.json, key
   `helpLines.<id>`). The hours and the numbers are checked per release against
   docs/cz-crisis-data-checklist.md. */
import type { Tone } from "../../ds";
import type { IconName } from "../../ds/Icon";
import { contentText } from "../../i18n/content";
import type { AgeBand } from "../../model";

export type LineId = "linka-bezpeci" | "lppp" | "obetem" | "rodicovska" | "zachranka" | "tisen";

export interface ContactLine {
  id: LineId;
  /** The number as the app shows it; `telHref` removes the spaces. */
  phone: string;
  icon: IconName;
  tone: Tone;
  readonly name: string;
  /** The dative form for sentences like "Zavolat Lince bezpečí" (the same as `name` in English). */
  readonly nameDative: string;
  readonly meta: string;
}

export interface EmergencyLine extends ContactLine {
  /** A short name for a small button: "záchranka", "tíseň". */
  readonly short: string;
}

export const telHref = (phone: string): string => `tel:${phone.replace(/\s/g, "")}`;

function line(id: LineId, phone: string, icon: IconName, tone: Tone): ContactLine {
  return {
    id,
    phone,
    icon,
    tone,
    get name() {
      return contentText(`helpLines.${id}.name`);
    },
    get nameDative() {
      return contentText(`helpLines.${id}.nameDative`);
    },
    get meta() {
      return contentText(`helpLines.${id}.meta`);
    },
  };
}

function emergency(id: "zachranka" | "tisen", phone: string): EmergencyLine {
  return {
    ...line(id, phone, "phone", "danger"),
    get name() {
      return contentText(`helpLines.${id}.name`);
    },
    get nameDative() {
      return contentText(`helpLines.${id}.nameDative`);
    },
    get meta() {
      return contentText(`helpLines.${id}.meta`);
    },
    get short() {
      return contentText(`helpLines.${id}.short`);
    },
  };
}

export const CONTACT_LINES: readonly ContactLine[] = [
  line("linka-bezpeci", "116 111", "phone", "danger"),
  line("lppp", "116 123", "phone", "danger"),
  line("obetem", "116 006", "phone", "danger"),
  line("rodicovska", "606 021 021", "phone", "info"),
];

/** The emergency numbers: always callable, whatever the age and the profile. */
export const EMERGENCY_LINES: readonly EmergencyLine[] = [
  emergency("zachranka", "155"),
  emergency("tisen", "112"),
];

export const LINE_BY_ID: Record<LineId, ContactLine> = Object.fromEntries(
  [...CONTACT_LINES, ...EMERGENCY_LINES].map((l) => [l.id, l]),
) as Record<LineId, ContactLine>;

/** The primary line of each age band. Without an age band, Help offers both lines. */
export const PRIMARY_LINE_BY_AGE: Record<AgeBand, LineId> = {
  u26: "linka-bezpeci",
  plus27: "lppp",
};

/** The primary line of each age band (onboarding, questionnaire and emergency screens). */
export const HELP_LINES: Record<AgeBand, ContactLine> = {
  u26: LINE_BY_ID[PRIMARY_LINE_BY_AGE.u26],
  plus27: LINE_BY_ID[PRIMARY_LINE_BY_AGE.plus27],
};
