/* Blind breath: the vibrations give the rhythm. The module holds pure logic and no user
   interface. A strong pulse starts the inhale, a double pulse starts the exhale, and the 4-7-8
   rhythm adds a soft tick in the middle of the hold. The labels of the rhythms come from the
   message catalog (calm.json, keys `blind.rhythm44` and `blind.rhythm478`); BlindBreathScreen reads them. */

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

/** The rhythms in the order of the choice list. */
export const BLIND_RHYTHM_IDS: readonly BlindRhythmId[] = ["4-4", "4-7-8"];

export const BLIND_DURATIONS_MIN = [1, 3, 5] as const;

export function cycleSeconds(rhythm: BlindRhythmId): number {
  return BLIND_RHYTHMS[rhythm].reduce((s, p) => s + p.seconds, 0);
}

export type BlindEvent = "inhale" | "exhale-double" | "hold-tick" | null;

/** The haptic event of one second of the exercise (from 0). */
export function blindEventAt(rhythm: BlindRhythmId, second: number): BlindEvent {
  let t = second % cycleSeconds(rhythm);
  for (const phase of BLIND_RHYTHMS[rhythm]) {
    if (t < phase.seconds) {
      if (t === 0) {
        if (phase.kind === "inhale") return "inhale";
        if (phase.kind === "exhale") return "exhale-double";
        return null; // The hold starts without a pulse. Only the tick in the middle marks it.
      }
      if (phase.kind === "hold" && t === Math.floor(phase.seconds / 2)) return "hold-tick";
      return null;
    }
    t -= phase.seconds;
  }
  return null; // Not reachable (t is less than the sum of the phases). The return satisfies TypeScript.
}
