/* The questionnaires: WHO-5, PHQ-9 and GAD-7. All three are free to use and ask about the last
   2 weeks (cadence 14 days). The text comes from the message catalog (content.json, key
   `instruments.<type>`). The Czech wording follows the standard Czech versions; the `_meta.todo`
   of each instrument in the catalog asks for a check of the exact wording before the release
   (docs/STATUS.md, finding 6). The English catalog holds the original wording of each
   instrument. The form "(a)" keeps the Czech text gender-neutral, as the printed versions do. */
import type { MeasurementType } from "../../db/repo";
import { contentText } from "../../i18n/content";

export interface AnswerOption {
  label: string;
  value: number;
}

export interface Instrument {
  type: MeasurementType;
  readonly title: string;
  /** The frame of the questions, shown above each question card. */
  readonly intro: string;
  readonly questions: string[];
  readonly options: AnswerOption[];
  maxScore: number;
}

/* The frequency scale of PHQ-9 and GAD-7 (0 to 3). */
const FREQUENCY_VALUES = [0, 1, 2, 3] as const;

/* The WHO-5 scale (5 to 0, from "all of the time" to "at no time"). */
const WHO5_VALUES = [5, 4, 3, 2, 1, 0] as const;

const WHO5_QUESTIONS = ["q1", "q2", "q3", "q4", "q5"] as const;
const PHQ9_QUESTIONS = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9"] as const;
const GAD7_QUESTIONS = ["q1", "q2", "q3", "q4", "q5", "q6", "q7"] as const;

/** The index (from zero) of the PHQ-9 question about death and self-harm. */
export const PHQ9_RISK_QUESTION_INDEX = 8;

function instrument<T extends MeasurementType>(
  type: T,
  questions: readonly string[],
  values: readonly number[],
  maxScore: number,
): Instrument {
  return {
    type,
    maxScore,
    get title() {
      return contentText(`instruments.${type}.title`);
    },
    get intro() {
      return contentText(`instruments.${type}.intro`);
    },
    get questions() {
      return questions.map((q) => contentText(`instruments.${type}.questions.${q}` as never));
    },
    get options() {
      return values.map((value) => ({
        value,
        label: contentText(`instruments.${type}.options.${value}` as never),
      }));
    },
  };
}

export const INSTRUMENTS: Record<MeasurementType, Instrument> = {
  who5: instrument("who5", WHO5_QUESTIONS, WHO5_VALUES, 100),
  phq9: instrument("phq9", PHQ9_QUESTIONS, FREQUENCY_VALUES, 27),
  gad7: instrument("gad7", GAD7_QUESTIONS, FREQUENCY_VALUES, 21),
};

export const MEASUREMENT_TYPES: MeasurementType[] = ["who5", "phq9", "gad7"];

export function isMeasurementType(v: string | undefined): v is MeasurementType {
  return v === "who5" || v === "phq9" || v === "gad7";
}
