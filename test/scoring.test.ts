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
    [0, "minimal"],
    [4, "minimal"],
    [5, "mild"],
    [9, "mild"],
    [10, "moderate"],
    [14, "moderate"],
    [15, "moderately-severe"],
    [19, "moderately-severe"],
    [20, "severe"],
    [27, "severe"],
  ])("skóre %i → %s", (score, id) => {
    expect(phq9Band(score).id).toBe(id);
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
    [0, "minimal"],
    [4, "minimal"],
    [5, "mild"],
    [9, "mild"],
    [10, "moderate"],
    [14, "moderate"],
    [15, "severe"],
    [21, "severe"],
  ])("skóre %i → %s", (score, id) => {
    expect(gad7Band(score).id).toBe(id);
  });
});

describe("trend vůči minulému měření", () => {
  it("bez minulého měření → žádný trend", () => {
    expect(trendText(10, null)).toBeNull();
    expect(trendText(10, undefined)).toBeNull();
  });
  it("deskriptivní formulace s českým plurálem", () => {
    expect(trendText(10, 10)).toBe("Stejně jako minule.");
    expect(trendText(11, 10)).toBe("O 1 bod víc než minule.");
    expect(trendText(8, 10)).toBe("O 2 body míň než minule.");
    expect(trendText(3, 10)).toBe("O 7 bodů míň než minule.");
  });
  it("WHO-5 se zobrazuje procentem → jednotka %", () => {
    expect(trendText(80, 76, "percent")).toBe("O 4 % víc než minule.");
    expect(trendText(60, 80, "percent")).toBe("O 20 % míň než minule.");
    expect(trendText(80, 80, "percent")).toBe("Stejně jako minule.");
  });
});
