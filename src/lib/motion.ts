/* Motion — délky animací a redukce pohybu. HIG: pohyb je účelný, krátký a
   volitelný; při zapnuté redukci nahrazujeme přechody prolnutím (fade). */
export { useReduceMotion } from "./a11y";

/** Délky v ms (DS motion tokeny; zdroj design/tokens/motion.json). */
export const dur = { fast: 150, base: 240, slow: 420, breath: 4000 } as const;
