/* The manifest of the color pairs that must meet WCAG 2.2 AA in both modes.
   Each pair = where the app really uses the color (see the comment). The test rejects a new
   text or border token without a pair: nobody can add a color silently without a check. */
import type { Theme } from "./types";

export interface ContrastPair {
  name: string;
  fg: string;
  bg: string;
  /** 4.5 = text (1.4.3), 3 = a non-text element / an outline / large text (1.4.11). */
  min: 4.5 | 3;
}

export function contrastPairs(t: Theme): ContrastPair[] {
  const c = t.colors;
  const pairs: ContrastPair[] = [];
  const text = (name: string, fg: string, bg: string) => pairs.push({ name, fg, bg, min: 4.5 });
  const ui = (name: string, fg: string, bg: string) => pairs.push({ name, fg, bg, min: 3 });

  /* text on surfaces */
  for (const [surf, bg] of [
    ["surfacePage", c.surfacePage],
    ["surfaceCard", c.surfaceCard],
    ["surfaceElevated", c.surfaceElevated],
  ] as const) {
    text(`textStrong/${surf}`, c.textStrong, bg);
    text(`textBody/${surf}`, c.textBody, bg);
    text(`textMuted/${surf}`, c.textMuted, bg);
    text(`textAccent/${surf}`, c.textAccent, bg);
    text(`textDanger/${surf}`, c.textDanger, bg);
    text(`textPositive/${surf}`, c.textPositive, bg);
    text(`textInfo/${surf}`, c.textInfo, bg);
    text(`textLilac/${surf}`, c.textLilac, bg);
  }
  text("textStrong/surfaceSunken", c.textStrong, c.surfaceSunken);
  text("textBody/surfaceSunken", c.textBody, c.surfaceSunken);
  text(
    "textOnSunken/surfaceSunken (placeholder, badge, disabled CTA)",
    c.textOnSunken,
    c.surfaceSunken,
  );
  text("textOnSunken/surfaceCard", c.textOnSunken, c.surfaceCard);
  text("textOnPrimary/surfacePrimary (primary button)", c.textOnPrimary, c.surfacePrimary);
  text("textOnCrisis/surfaceCrisis (crisis button)", c.textOnCrisis, c.surfaceCrisis);

  /* text in soft fills (badge, tip cards, the crisis section) */
  for (const [name, bg, fg] of [
    ["accent", c.accentSoft, c.textAccent],
    ["positive", c.positiveSoft, c.textPositive],
    ["info", c.infoSoft, c.textInfo],
    ["danger", c.dangerSoft, c.textDanger],
    ["lilac", c.lilacSoft, c.textLilac],
  ] as const) {
    text(`text${name}/${name}Soft`, fg, bg);
    text(`textStrong/${name}Soft`, c.textStrong, bg);
    text(`textBody/${name}Soft`, c.textBody, bg);
    /* the app does not use textOnSunken on soft fills (it does not reach 4.5:1);
       there textBody or the tone shade (text${name}) carries the secondary text */
  }

  /* outlines, fills of controls, selection */
  for (const [surf, bg] of [
    ["surfacePage", c.surfacePage],
    ["surfaceCard", c.surfaceCard],
    ["surfaceSunken", c.surfaceSunken],
  ] as const) {
    ui(`borderStrong/${surf}`, c.borderStrong, bg);
    ui(`accentFill/${surf} (ring, slider, progress)`, c.accentFill, bg);
    ui(`selectionBorder/${surf}`, c.selectionBorder, bg);
    ui(`focusRing/${surf}`, c.focusRing, bg);
  }
  ui("selectionBorder/accentSoft (selected chip)", c.selectionBorder, c.accentSoft);
  ui("surfacePrimary/surfacePage (primary button fill)", c.surfacePrimary, c.surfacePage);
  ui("surfacePrimary/surfaceCard", c.surfacePrimary, c.surfaceCard);
  ui("surfaceCrisis/surfacePage", c.surfaceCrisis, c.surfacePage);
  ui("surfaceCrisis/dangerSoft (crisis button in crisis card)", c.surfaceCrisis, c.dangerSoft);

  /* moods: the outline of the shape (strong) must define the shape on every surface where the
     app draws it; text on the soft tile of a mood */
  for (const id of ["energie", "napeti", "klid", "utlum"] as const) {
    const m = t.mood[id];
    ui(`mood.${id}.strong/surfaceCard`, m.strong, c.surfaceCard);
    ui(`mood.${id}.strong/surfacePage`, m.strong, c.surfacePage);
    ui(`mood.${id}.strong/surfaceSunken`, m.strong, c.surfaceSunken);
    ui(`mood.${id}.strong/soft`, m.strong, m.soft);
    text(`mood.${id}.strong as text/soft`, m.strong, m.soft);
    text(`textStrong/mood.${id}.soft`, c.textStrong, m.soft);
  }
  return pairs;
}
