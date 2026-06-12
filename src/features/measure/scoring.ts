/* Skórování dotazníků — čisté funkce, kompletně pokryté testy.
   Výsledky se nikdy neprezentují jako diagnóza: pásma jsou deskriptivní
   („odpovědi odpovídají pásmu…“), trend vždy jen vůči vlastním datům. */
import type { MeasurementType } from "../../db/repo";

/** WHO-5: součet pěti odpovědí 0–5 (max 25) × 4 = 0–100 %. */
export function who5Percent(answers: number[]): number {
  return answers.reduce((s, a) => s + a, 0) * 4;
}

/** PHQ-9 / GAD-7: prostý součet odpovědí 0–3. */
export function sumScore(answers: number[]): number {
  return answers.reduce((s, a) => s + a, 0);
}

export function scoreFor(type: MeasurementType, answers: number[]): number {
  return type === "who5" ? who5Percent(answers) : sumScore(answers);
}

export interface Band {
  id: string;
  /** Krátký popisek pásma (zobrazuje se velkým písmem). */
  label: string;
  /** Deskriptivní věta — nikdy diagnóza. */
  text: string;
}

/* PHQ-9: 0–4 / 5–9 / 10–14 / 15–19 / 20–27 */
export function phq9Band(score: number): Band {
  if (score <= 4)
    return {
      id: "minimal",
      label: "minimální příznaky",
      text: "Odpovědi odpovídají pásmu minimálních příznaků.",
    };
  if (score <= 9)
    return {
      id: "mild",
      label: "mírné příznaky",
      text: "Odpovědi odpovídají pásmu mírných příznaků.",
    };
  if (score <= 14)
    return {
      id: "moderate",
      label: "středně závažné příznaky",
      text: "Odpovědi odpovídají pásmu středně závažných příznaků. Může pomoct probrat to s někým blízkým nebo s odbornou podporou.",
    };
  if (score <= 19)
    return {
      id: "moderately-severe",
      label: "závažnější příznaky",
      text: "Odpovědi odpovídají pásmu závažnějších příznaků. Stojí za to říct si o odbornou podporu — v Pomoci najdeš, kde začít.",
    };
  return {
    id: "severe",
    label: "výrazné příznaky",
    text: "Odpovědi odpovídají pásmu výrazných příznaků. Stojí za to říct si o odbornou podporu co nejdřív — v Pomoci najdeš, kde začít.",
  };
}

/* GAD-7: 0–4 / 5–9 / 10–14 / 15–21 */
export function gad7Band(score: number): Band {
  if (score <= 4)
    return {
      id: "minimal",
      label: "minimální příznaky",
      text: "Odpovědi odpovídají pásmu minimálních příznaků.",
    };
  if (score <= 9)
    return {
      id: "mild",
      label: "mírné příznaky",
      text: "Odpovědi odpovídají pásmu mírných příznaků.",
    };
  if (score <= 14)
    return {
      id: "moderate",
      label: "střední příznaky",
      text: "Odpovědi odpovídají pásmu středních příznaků. Může pomoct probrat to s někým blízkým nebo s odbornou podporou.",
    };
  return {
    id: "severe",
    label: "výrazné příznaky",
    text: "Odpovědi odpovídají pásmu výrazných příznaků. Stojí za to říct si o odbornou podporu — v Pomoci najdeš, kde začít.",
  };
}

export function bandFor(type: MeasurementType, score: number): Band | null {
  if (type === "phq9") return phq9Band(score);
  if (type === "gad7") return gad7Band(score);
  return null; // WHO-5 se prezentuje procentem, ne pásmem
}

/** Trend vůči minulému měření — deskriptivně, jen vůči vlastním datům.
    WHO-5 se zobrazuje procentem, proto jednotka „%“; PHQ-9/GAD-7 body. */
export function trendText(
  score: number,
  prev: number | null | undefined,
  unit: "points" | "percent" = "points",
): string | null {
  if (prev === null || prev === undefined) return null;
  const diff = score - prev;
  if (diff === 0) return "Stejně jako minule.";
  const n = Math.abs(diff);
  const body =
    unit === "percent" ? `O ${n} %` : `O ${n} ${n === 1 ? "bod" : n <= 4 ? "body" : "bodů"}`;
  return diff > 0 ? `${body} víc než minule.` : `${body} míň než minule.`;
}
