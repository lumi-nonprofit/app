/* Skórovací funkce dotazníků — včetně všech hraničních hodnot pásem. */
import {
  bandFor,
  gad7Band,
  phq9Band,
  scoreFor,
  sumScore,
  trendText,
  who5Percent,
} from "../src/features/measure/scoring";

describe("WHO-5", () => {
  it("součet × 4 = 0–100 %", () => {
    expect(who5Percent([0, 0, 0, 0, 0])).toBe(0);
    expect(who5Percent([5, 5, 5, 5, 5])).toBe(100);
    expect(who5Percent([3, 2, 4, 1, 5])).toBe(60);
    expect(scoreFor("who5", [1, 1, 1, 1, 1])).toBe(20);
  });
  it("WHO-5 nemá pásmo (prezentuje se procentem)", () => {
    expect(bandFor("who5", 48)).toBeNull();
  });
});

describe("PHQ-9 pásma (0–4 / 5–9 / 10–14 / 15–19 / 20–27)", () => {
  it.each([
    [0, "minimal", "Odpovědi odpovídají pásmu minimálních příznaků."],
    [4, "minimal", "Odpovědi odpovídají pásmu minimálních příznaků."],
    [5, "mild", "Odpovědi odpovídají pásmu mírných příznaků."],
    [9, "mild", "Odpovědi odpovídají pásmu mírných příznaků."],
    [
      10,
      "moderate",
      "Odpovědi odpovídají pásmu středně závažných příznaků. Může pomoct probrat to s někým blízkým nebo s odbornou podporou.",
    ],
    [
      14,
      "moderate",
      "Odpovědi odpovídají pásmu středně závažných příznaků. Může pomoct probrat to s někým blízkým nebo s odbornou podporou.",
    ],
    [
      15,
      "moderately-severe",
      "Odpovědi odpovídají pásmu závažnějších příznaků. Stojí za to říct si o odbornou podporu — v Pomoci najdeš, kde začít.",
    ],
    [
      19,
      "moderately-severe",
      "Odpovědi odpovídají pásmu závažnějších příznaků. Stojí za to říct si o odbornou podporu — v Pomoci najdeš, kde začít.",
    ],
    [
      20,
      "severe",
      "Odpovědi odpovídají pásmu výrazných příznaků. Stojí za to říct si o odbornou podporu co nejdřív — v Pomoci najdeš, kde začít.",
    ],
    [
      27,
      "severe",
      "Odpovědi odpovídají pásmu výrazných příznaků. Stojí za to říct si o odbornou podporu co nejdřív — v Pomoci najdeš, kde začít.",
    ],
  ])("skóre %i → %s", (score, id, expectedText) => {
    expect(phq9Band(score).id).toBe(id);
    expect(phq9Band(score).text).toBe(expectedText);
  });
  it("texty jsou deskriptivní, ne diagnóza", () => {
    for (const s of [0, 5, 10, 15, 20]) {
      expect(phq9Band(s).text).toMatch(/^Odpovědi odpovídají pásmu/);
      expect(phq9Band(s).text).not.toMatch(/deprese|diagnóz/i);
    }
  });
  it("součet odpovědí", () => {
    expect(sumScore([3, 3, 3, 3, 3, 3, 3, 3, 3])).toBe(27);
    expect(scoreFor("phq9", [1, 0, 2, 0, 0, 0, 0, 0, 1])).toBe(4);
  });
});

describe("GAD-7 pásma (0–4 / 5–9 / 10–14 / 15–21)", () => {
  it.each([
    [0, "minimal", "Odpovědi odpovídají pásmu minimálních příznaků."],
    [4, "minimal", "Odpovědi odpovídají pásmu minimálních příznaků."],
    [5, "mild", "Odpovědi odpovídají pásmu mírných příznaků."],
    [9, "mild", "Odpovědi odpovídají pásmu mírných příznaků."],
    [
      10,
      "moderate",
      "Odpovědi odpovídají pásmu středních příznaků. Může pomoct probrat to s někým blízkým nebo s odbornou podporou.",
    ],
    [
      14,
      "moderate",
      "Odpovědi odpovídají pásmu středních příznaků. Může pomoct probrat to s někým blízkým nebo s odbornou podporou.",
    ],
    [
      15,
      "severe",
      "Odpovědi odpovídají pásmu výrazných příznaků. Stojí za to říct si o odbornou podporu — v Pomoci najdeš, kde začít.",
    ],
    [
      21,
      "severe",
      "Odpovědi odpovídají pásmu výrazných příznaků. Stojí za to říct si o odbornou podporu — v Pomoci najdeš, kde začít.",
    ],
  ])("skóre %i → %s", (score, id, expectedText) => {
    expect(gad7Band(score).id).toBe(id);
    expect(gad7Band(score).text).toBe(expectedText);
  });
  it("texty jsou deskriptivní, ne diagnóza", () => {
    for (const s of [0, 5, 10, 15]) {
      expect(gad7Band(s).text).toMatch(/^Odpovědi odpovídají pásmu/);
      expect(gad7Band(s).text).not.toMatch(/deprese|diagnóz/i);
    }
  });
});

describe("trend vůči minulému měření", () => {
  it("bez minulého měření → žádný trend", () => {
    expect(trendText(10, null)).toBeNull();
    expect(trendText(10, undefined)).toBeNull();
  });
  it("deskriptivní formulace s českým plurálem", () => {
    // 0 rozdíl
    expect(trendText(10, 10)).toBe("Stejně jako minule.");

    // 1 = bod
    expect(trendText(11, 10)).toBe("O 1 bod víc než minule.");

    // 2–4 = body
    expect(trendText(8, 10)).toBe("O 2 body míň než minule.");
    expect(trendText(14, 10)).toBe("O 4 body víc než minule.");

    // 0, 5+ a teen hodnoty = bodů
    expect(trendText(5, 10)).toBe("O 5 bodů míň než minule.");
    expect(trendText(21, 10)).toBe("O 11 bodů víc než minule.");
    expect(trendText(32, 10)).toBe("O 22 bodů víc než minule.");
    expect(trendText(3, 10)).toBe("O 7 bodů míň než minule.");
  });
  it("WHO-5 se zobrazuje procentem → jednotka %", () => {
    expect(trendText(80, 76, "percent")).toBe("O 4 % víc než minule.");
    expect(trendText(60, 80, "percent")).toBe("O 20 % míň než minule.");
    expect(trendText(80, 80, "percent")).toBe("Stejně jako minule.");
  });
});
