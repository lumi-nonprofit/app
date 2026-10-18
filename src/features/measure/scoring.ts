/* The scores of the questionnaires: pure functions with full test coverage. A result is never a
   diagnosis: a band is descriptive ("the answers match the band ..."), and a trend compares only
   with the own data. The texts come from the message catalogs. */
import type { MeasurementType } from "../../db/repo";
import i18n from "../../i18n";
import { contentText } from "../../i18n/content";
import { formatPercent } from "../../i18n/format";

/** WHO-5: the sum of the 5 answers 0 to 5 (maximum 25) times 4 = 0 to 100 %. */
export function who5Percent(answers: number[]): number {
  return answers.reduce((s, a) => s + a, 0) * 4;
}

/** PHQ-9 and GAD-7: the plain sum of the answers 0 to 3. */
export function sumScore(answers: number[]): number {
  return answers.reduce((s, a) => s + a, 0);
}

export function scoreFor(type: MeasurementType, answers: number[]): number {
  return type === "who5" ? who5Percent(answers) : sumScore(answers);
}

export type Phq9BandId = "minimal" | "mild" | "moderate" | "moderately-severe" | "severe";
export type Gad7BandId = "minimal" | "mild" | "moderate" | "severe";

export interface Band {
  id: Phq9BandId | Gad7BandId;
  /** The short name of the band (shown large). */
  readonly label: string;
  /** A descriptive sentence, never a diagnosis. */
  readonly text: string;
}

function band(type: "phq9", id: Phq9BandId): Band;
function band(type: "gad7", id: Gad7BandId): Band;
function band(type: "phq9" | "gad7", id: Phq9BandId | Gad7BandId): Band {
  return {
    id,
    get label() {
      return contentText(`bands.${type}.${id}.label` as never);
    },
    get text() {
      return contentText(`bands.${type}.${id}.text` as never);
    },
  };
}

/* PHQ-9: 0 to 4, 5 to 9, 10 to 14, 15 to 19, 20 to 27 */
export function phq9Band(score: number): Band {
  if (score <= 4) return band("phq9", "minimal");
  if (score <= 9) return band("phq9", "mild");
  if (score <= 14) return band("phq9", "moderate");
  if (score <= 19) return band("phq9", "moderately-severe");
  return band("phq9", "severe");
}

/* GAD-7: 0 to 4, 5 to 9, 10 to 14, 15 to 21 */
export function gad7Band(score: number): Band {
  if (score <= 4) return band("gad7", "minimal");
  if (score <= 9) return band("gad7", "mild");
  if (score <= 14) return band("gad7", "moderate");
  return band("gad7", "severe");
}

export function bandFor(type: MeasurementType, score: number): Band | null {
  if (type === "phq9") return phq9Band(score);
  if (type === "gad7") return gad7Band(score);
  return null; // WHO-5 shows a percentage, not a band
}

/** The trend against the previous measurement: descriptive, only against the own data.
    WHO-5 shows a percentage, so the unit is "%"; PHQ-9 and GAD-7 count points. */
export function trendText(
  score: number,
  prev: number | null | undefined,
  unit: "points" | "percent" = "points",
): string | null {
  if (prev === null || prev === undefined) return null;
  const diff = score - prev;
  if (diff === 0) return i18n.t("measure:trend.same");
  const n = Math.abs(diff);
  const amount =
    unit === "percent"
      ? i18n.t("measure:trend.byPercent", { value: formatPercent(n) })
      : i18n.t("measure:trend.byPoints", { count: n });
  return diff > 0
    ? i18n.t("measure:trend.more", { amount })
    : i18n.t("measure:trend.less", { amount });
}
