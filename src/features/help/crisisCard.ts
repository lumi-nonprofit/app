/* Krizová kartička — čistá funkce, která z obsahu plánu složí HTML pro tisk
   (volá ji HelpScreen přes expo-print printToFileAsync). ŽÁDNÉ importy z RN:
   modul musí jít volat i v testu bez nativního prostředí.

   Layout: A4 na výšku, dvě kartičky velikosti vizitky (85.6 × 54 mm) pod
   sebou s mezerou; každá má v rozích sesazovací značky, aby se daly přesně
   vystřihnout. Přední strana = signály + co pomáhá, zadní = kontakty +
   krizové linky. Tisk je černobílý (#000 na #fff), bez ozdob.

   BEZPEČNOST: veškerý text od uživatele se escapuje (escapeHtml) — do HTML
   se nikdy nevkládá syrový vstup. Sekce se zkracují na rozumnou délku, ať se
   text na kartičku vejde. */

/** Rozměry vizitky v milimetrech (ISO 7810 ID-1). */
export const CARD_W_MM = 85.6;
export const CARD_H_MM = 54;

/* Maximální délka textu jedné sekce, ať se na kartičku vejde. */
const MAX_SECTION_CHARS = 140;

/** Escapuje znaky nebezpečné v HTML (& < > " '). */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Zkrátí text na max. `max` znaků na hranici slova a doplní „…". */
export function truncate(input: string, max: number = MAX_SECTION_CHARS): string {
  const text = input.trim();
  if (text.length <= max) return text;
  /* useknout o znak míň, ať se vejde i výpustka, a couvnout na konec slova */
  const slice = text.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  const head = (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trimEnd();
  return `${head}…`;
}

/** Sekce → escapovaný, zkrácený HTML text (escape AŽ po truncate). */
function section(text: string): string {
  return escapeHtml(truncate(text));
}

/* Krizové linky na zadní straně — neměnné, nezávislé na věku (na malé
   kartičce dáváme všechny, ať je po ruce dětská i dospělá). */
const CRISIS_LINES: string[] = [
  "116 111 — Linka bezpečí (do 26 let)",
  "116 123 — Linka první psychické pomoci",
  "155 — záchranná služba",
  "112 — tísňová linka",
];

/* Čtyři rohové sesazovací značky (L-čáry z pozicovaných divů). */
const CROP_MARKS = `
      <div class="crop crop-tl"></div>
      <div class="crop crop-tr"></div>
      <div class="crop crop-bl"></div>
      <div class="crop crop-br"></div>`;

export interface CrisisPlanContentLike {
  signals: string;
  helps: string;
  contacts: string;
}

/** Složí tiskové HTML krizové kartičky z obsahu plánu. */
export function crisisCardHtml(plan: CrisisPlanContentLike): string {
  const linesHtml = CRISIS_LINES.map((l) => `<div class="line">${escapeHtml(l)}</div>`).join("");

  return `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8" />
<style>
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
  /* sesazovací značky: krátké L-čáry v rozích (1px černé okraje, ~4mm) */
  .crop {
    position: absolute;
    width: 4mm;
    height: 4mm;
  }
  .crop-tl { top: -1px; left: -1px; border-top: 1px solid #000; border-left: 1px solid #000 }
  .crop-tr { top: -1px; right: -1px; border-top: 1px solid #000; border-right: 1px solid #000 }
  .crop-bl { bottom: -1px; left: -1px; border-bottom: 1px solid #000; border-left: 1px solid #000 }
  .crop-br { bottom: -1px; right: -1px; border-bottom: 1px solid #000; border-right: 1px solid #000 }
</style>
</head>
<body>
  <p class="note">Vytiskni, přelož, zalaminuj — a nos s sebou.</p>

  <div class="card" aria-label="Přední strana">${CROP_MARKS}
    <h2>Moje varovné signály</h2>
    <p>${section(plan.signals)}</p>
    <h2>Co mi pomáhá</h2>
    <p>${section(plan.helps)}</p>
  </div>

  <div class="card" aria-label="Zadní strana">${CROP_MARKS}
    <h2>Na koho se obrátím</h2>
    <p>${section(plan.contacts)}</p>
    <div class="lines">${linesHtml}</div>
  </div>
</body>
</html>`;
}
