/* Motion: the durations of the animations and the reduce-motion setting. HIG: motion is
   purposeful, short and optional; with the reduction on, a fade replaces the transitions. */
export { useReduceMotion } from "./a11y";

/** The durations in ms (the DS motion tokens; the source is design/tokens/motion.json). */
export const dur = { fast: 150, base: 240, slow: 420, breath: 4000 } as const;
