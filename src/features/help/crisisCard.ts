/* The crisis card: a pure function that builds the print HTML from the content of the plan
   (HelpScreen calls it through expo-print printToFileAsync). The module imports no React Native
   component, so a test can call it without the native environment. The texts come from the
   `help` catalog (`card.*`), the headings from plan.ts and the lines from lines.ts.

   Layout: A4 portrait, 2 cards of business-card size (85.6 × 54 mm) under each other with a gap.
   Each card has crop marks in the corners, so the person can cut it out exactly. The front holds
   the signals and what helps, the back holds the contacts and the crisis lines. The print is
   black on white, without decoration.

   Safety: every text of the user goes through escapeHtml. Raw input never reaches the HTML. The
   sections are cut to a sensible length, so the text fits on the card. */
import i18n, { currentLocale } from "../../i18n";
import { EMERGENCY_LINES, HELP_LINES } from "./lines";
import { PLAN_SECTIONS, type PlanSectionId } from "./plan";

/** The size of a business card in millimetres (ISO 7810 ID-1). */
export const CARD_W_MM = 85.6;
export const CARD_H_MM = 54;

/* The maximum length of one section, so that the text fits on the card. */
const MAX_SECTION_CHARS = 140;

/* The characters that are dangerous in HTML and their entities. */
const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const ELLIPSIS = "…";

/** Escapes the characters that are dangerous in HTML (& < > " '). */
export function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (ch) => HTML_ENTITIES[ch] ?? ch);
}

/** Cuts the text to `max` characters at a word boundary and adds an ellipsis. */
export function truncate(input: string, max: number = MAX_SECTION_CHARS): string {
  const text = input.trim();
  if (text.length <= max) return text;
  /* Cut one character less, so that the ellipsis fits, and step back to the end of a word. */
  const slice = text.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  const head = (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trimEnd();
  return `${head}${ELLIPSIS}`;
}

/** A section as escaped and cut HTML text (the escape runs after the cut). */
function section(text: string): string {
  return escapeHtml(truncate(text));
}

/** The escaped title of a plan section. */
function planTitle(id: PlanSectionId): string {
  return escapeHtml(PLAN_SECTIONS.find((s) => s.id === id)?.title ?? "");
}

/* The crisis lines on the back: the primary line of each age band and the emergency numbers. The
   small card carries all of them, so the line for children and the line for adults are both at
   hand. */
function crisisLines(): string[] {
  const youth = HELP_LINES.u26;
  const adults = HELP_LINES.plus27;
  return [
    i18n.t("help:card.lineWithAge", {
      phone: youth.phone,
      name: youth.name,
      age: i18n.t("common:ageBands.u26.label"),
    }),
    i18n.t("help:card.line", { phone: adults.phone, name: adults.name }),
    ...EMERGENCY_LINES.map((line) =>
      i18n.t("help:card.line", { phone: line.phone, name: line.name }),
    ),
  ];
}

/* The 4 crop marks in the corners (L-shaped lines from positioned divs). */
const CROP_MARKS = `
      <div class="crop crop-tl"></div>
      <div class="crop crop-tr"></div>
      <div class="crop crop-bl"></div>
      <div class="crop crop-br"></div>`;

/* The print styles. The crop marks are short L-shaped lines in the corners (1px black borders,
   about 4mm). */
const CARD_STYLES = `
  @page { size: A4; margin: 0 }
  * { box-sizing: border-box; margin: 0; padding: 0 }
  body {
    width: 210mm;
    height: 297mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12mm;
    background: #fff;
    color: #000;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 8.5pt;
    line-height: 1.35;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .note {
    font-size: 8.5pt;
    color: #000;
  }
  .card {
    position: relative;
    width: ${CARD_W_MM}mm;
    height: ${CARD_H_MM}mm;
    padding: 5mm;
    background: #fff;
    color: #000;
    border: 1px solid #000;
    overflow: hidden;
  }
  .card h2 {
    font-size: 9.5pt;
    font-weight: 700;
    margin-bottom: 1mm;
  }
  .card h2 + p { margin-bottom: 3mm }
  .card p { font-size: 8.5pt }
  .lines { margin-top: 2mm }
  .lines .line { font-size: 7.5pt; line-height: 1.5 }
  .crop {
    position: absolute;
    width: 4mm;
    height: 4mm;
  }
  .crop-tl { top: -1px; left: -1px; border-top: 1px solid #000; border-left: 1px solid #000 }
  .crop-tr { top: -1px; right: -1px; border-top: 1px solid #000; border-right: 1px solid #000 }
  .crop-bl { bottom: -1px; left: -1px; border-bottom: 1px solid #000; border-left: 1px solid #000 }
  .crop-br { bottom: -1px; right: -1px; border-bottom: 1px solid #000; border-right: 1px solid #000 }
`;

export interface CrisisPlanContentLike {
  signals: string;
  helps: string;
  contacts: string;
}

/** Builds the print HTML of the crisis card from the content of the plan. */
export function crisisCardHtml(plan: CrisisPlanContentLike): string {
  const linesHtml = crisisLines()
    // eslint-disable-next-line i18next/no-literal-string -- HTML markup of the print layout; the text comes from the catalog
    .map((line) => `<div class="line">${escapeHtml(line)}</div>`)
    .join("");

  // eslint-disable-next-line i18next/no-literal-string -- HTML markup of the print layout; the text comes from the catalog
  return `<!doctype html>
<html lang="${currentLocale()}">
<head>
<meta charset="utf-8" />
<style>${CARD_STYLES}</style>
</head>
<body>
  <p class="note">${escapeHtml(i18n.t("help:card.note"))}</p>

  <div class="card" aria-label="${escapeHtml(i18n.t("help:card.front"))}">${CROP_MARKS}
    <h2>${planTitle("signals")}</h2>
    <p>${section(plan.signals)}</p>
    <h2>${planTitle("helps")}</h2>
    <p>${section(plan.helps)}</p>
  </div>

  <div class="card" aria-label="${escapeHtml(i18n.t("help:card.back"))}">${CROP_MARKS}
    <h2>${planTitle("contacts")}</h2>
    <p>${section(plan.contacts)}</p>
    <div class="lines">${linesHtml}</div>
  </div>
</body>
</html>`;
}
