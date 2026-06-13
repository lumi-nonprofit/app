/* Dech naslepo — rytmus vedený vibracemi, čistá logika bez UI.
   Výrazný impulz na začátku nádechu, dvojitý na začátku výdechu,
   u 4-7-8 navíc jemný tik uprostřed zádrže. */

export type BlindRhythmId = "4-4" | "4-7-8";

export interface BlindPhase {
  kind: "inhale" | "hold" | "exhale";
  seconds: number;
}

export const BLIND_RHYTHMS: Record<BlindRhythmId, BlindPhase[]> = {
  "4-4": [
    { kind: "inhale", seconds: 4 },
    { kind: "exhale", seconds: 4 },
  ],
  "4-7-8": [
    { kind: "inhale", seconds: 4 },
    { kind: "hold", seconds: 7 },
    { kind: "exhale", seconds: 8 },
  ],
};

export const BLIND_RHYTHM_LABELS: Record<BlindRhythmId, string> = {
  "4-4": "4-4 · klidný rytmus",
  "4-7-8": "4-7-8 · při napětí",
};

export const BLIND_DURATIONS_MIN = [1, 3, 5] as const;

export function cycleSeconds(rhythm: BlindRhythmId): number {
  return BLIND_RHYTHMS[rhythm].reduce((s, p) => s + p.seconds, 0);
}

export type BlindEvent = "inhale" | "exhale-double" | "hold-tick" | null;

/** Haptická událost pro danou odehranou vteřinu (od 0). */
export function blindEventAt(rhythm: BlindRhythmId, second: number): BlindEvent {
  let t = second % cycleSeconds(rhythm);
  for (const phase of BLIND_RHYTHMS[rhythm]) {
    if (t < phase.seconds) {
      if (t === 0) {
        if (phase.kind === "inhale") return "inhale";
        if (phase.kind === "exhale") return "exhale-double";
        return null; // začátek zádrže bez impulzu — odděluje ji až tik uprostřed
      }
      if (phase.kind === "hold" && t === Math.floor(phase.seconds / 2)) return "hold-tick";
      return null;
    }
    t -= phase.seconds;
  }
  return null; // nedosažitelné (t < součet fází) — pojistka pro TS
}
