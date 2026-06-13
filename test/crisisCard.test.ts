/* Krizová kartička (čistá funkce, žádný render): escapování uživatelského
   textu, přítomnost krizových linek a nadpisů, zkracování dlouhých sekcí
   a tiskové parametry stránky. */
import {
  crisisCardHtml,
  escapeHtml,
  truncate,
  CARD_W_MM,
  CARD_H_MM,
} from "../src/features/help/crisisCard";

describe("crisisCardHtml", () => {
  it("escapuje nebezpečný uživatelský vstup (žádný syrový < ani &)", () => {
    const html = crisisCardHtml({
      signals: "<script>alert(1)</script>",
      helps: "káva & klid",
      contacts: "máma",
    });
    // injektovaný tag se nesmí dostat do HTML jako syrová značka
    expect(html).not.toContain("<script");
    expect(html).toContain("&lt;script&gt;");
    // ampersand z uživatelského textu je escapovaný
    expect(html).toContain("&amp;");
  });

  it("obsahuje všechna čtyři krizová čísla", () => {
    const html = crisisCardHtml({ signals: "", helps: "", contacts: "" });
    expect(html).toContain("116 111");
    expect(html).toContain("116 123");
    expect(html).toContain("155");
    expect(html).toContain("112");
  });

  it("obsahuje tři nadpisy sekcí", () => {
    const html = crisisCardHtml({ signals: "", helps: "", contacts: "" });
    expect(html).toContain("Moje varovné signály");
    expect(html).toContain("Co mi pomáhá");
    expect(html).toContain("Na koho se obrátím");
  });

  it("dlouhou sekci zkrátí na rozumnou délku zakončenou výpustkou", () => {
    const long = "slovo ".repeat(100).trim(); // ~599 znaků
    const html = crisisCardHtml({ signals: long, helps: "", contacts: "" });
    // vytáhni tělo první sekce (odstavec za nadpisem „Moje varovné signály")
    const match = html.match(/Moje varovné signály<\/h2>\s*<p>([\s\S]*?)<\/p>/);
    expect(match).not.toBeNull();
    const body = match![1];
    expect(body.length).toBeLessThanOrEqual(150);
    expect(body.endsWith("…")).toBe(true);
  });

  it("obsahuje tiskové parametry stránky a rozměry kartičky", () => {
    const html = crisisCardHtml({ signals: "", helps: "", contacts: "" });
    expect(html).toContain("@page");
    expect(html).toContain("85.6mm");
    expect(html).toContain("54mm");
  });

  it("obsahuje pokyn k tisku mimo kartičky", () => {
    const html = crisisCardHtml({ signals: "", helps: "", contacts: "" });
    expect(html).toContain("Vytiskni, přelož, zalaminuj — a nos s sebou.");
  });
});

describe("escapeHtml", () => {
  it("nahradí & < > \" '", () => {
    expect(escapeHtml("a & b < c > d \" e ' f")).toBe("a &amp; b &lt; c &gt; d &quot; e &#39; f");
  });
});

describe("truncate", () => {
  it("krátký text nechá beze změny", () => {
    expect(truncate("krátké")).toBe("krátké");
  });

  it("dlouhý text zkrátí na hranici slova a doplní výpustku", () => {
    const out = truncate("a".repeat(60) + " " + "b".repeat(200), 100);
    expect(out.length).toBeLessThanOrEqual(100);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("rozměry kartičky", () => {
  it("odpovídají ISO 7810 ID-1", () => {
    expect(CARD_W_MM).toBe(85.6);
    expect(CARD_H_MM).toBe(54);
  });
});
