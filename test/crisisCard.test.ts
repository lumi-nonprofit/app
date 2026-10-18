/* The crisis card (a pure function, no render): the escape of the text of the user, the presence
   of the crisis lines and the headings, the cut of long sections and the print parameters of the
   page. */
import {
  crisisCardHtml,
  escapeHtml,
  truncate,
  CARD_W_MM,
  CARD_H_MM,
} from "../src/features/help/crisisCard";

describe("crisisCardHtml", () => {
  it("escapes dangerous input of the user (no raw < or &)", () => {
    const html = crisisCardHtml({
      signals: "<script>alert(1)</script>",
      helps: "káva & klid",
      contacts: "máma",
    });
    // The injected tag must not reach the HTML as a raw tag.
    expect(html).not.toContain("<script");
    expect(html).toContain("&lt;script&gt;");
    // escapeHtml replaces the ampersand from the text of the user.
    expect(html).toContain("&amp;");
  });

  it("contains all 4 crisis numbers", () => {
    const html = crisisCardHtml({ signals: "", helps: "", contacts: "" });
    expect(html).toContain("116 111");
    expect(html).toContain("116 123");
    expect(html).toContain("155");
    expect(html).toContain("112");
  });

  it("contains the 3 section headings", () => {
    const html = crisisCardHtml({ signals: "", helps: "", contacts: "" });
    expect(html).toContain("Moje varovné signály");
    expect(html).toContain("Co mi pomáhá");
    expect(html).toContain("Na koho se obrátím");
  });

  it("cuts a long section to a sensible length that ends with an ellipsis", () => {
    const long = "slovo ".repeat(100).trim(); // about 599 characters
    const html = crisisCardHtml({ signals: long, helps: "", contacts: "" });
    // Take the body of the first section (the paragraph after the heading "Moje varovné signály").
    const match = html.match(/Moje varovné signály<\/h2>\s*<p>([\s\S]*?)<\/p>/);
    expect(match).not.toBeNull();
    const body = match![1];
    expect(body.length).toBeLessThanOrEqual(150);
    expect(body.endsWith("…")).toBe(true);
  });

  it("contains the print parameters of the page and the size of the card", () => {
    const html = crisisCardHtml({ signals: "", helps: "", contacts: "" });
    expect(html).toContain("@page");
    expect(html).toContain("85.6mm");
    expect(html).toContain("54mm");
  });

  it("contains the print instruction outside the cards", () => {
    const html = crisisCardHtml({ signals: "", helps: "", contacts: "" });
    expect(html).toContain("Vytiskni, přelož, zalaminuj — a nos s sebou.");
  });
});

describe("escapeHtml", () => {
  it("replaces & < > \" '", () => {
    expect(escapeHtml("a & b < c > d \" e ' f")).toBe("a &amp; b &lt; c &gt; d &quot; e &#39; f");
  });
});

describe("truncate", () => {
  it("keeps a short text unchanged", () => {
    expect(truncate("krátké")).toBe("krátké");
  });

  it("cuts a long text at a word boundary and adds an ellipsis", () => {
    const out = truncate("a".repeat(60) + " " + "b".repeat(200), 100);
    expect(out.length).toBeLessThanOrEqual(100);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("card size", () => {
  it("matches ISO 7810 ID-1", () => {
    expect(CARD_W_MM).toBe(85.6);
    expect(CARD_H_MM).toBe(54);
  });
});
