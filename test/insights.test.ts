/* Local insights: the thresholds (3 occurrences or more), the descriptive wording, the Czech
   agreement of the participle with the mood, and the instrumental case of the tags. */
import { computeInsights, daypartOf, tooFewDataText } from "../src/features/stats/insights";
import type { Entry } from "../src/model";

let seq = 0;
const entry = (e: Partial<Entry> & Pick<Entry, "mood" | "intensity">): Entry => ({
  id: `${1770000000000 + seq}-i${seq++}`,
  date: "2026-06-12",
  time: "9:00",
  words: [],
  tags: [],
  note: "",
  ...e,
});

describe("daypartOf", () => {
  it("splits the day into morning, afternoon and evening", () => {
    expect(daypartOf("0:15")).toBe("morning");
    expect(daypartOf("11:59")).toBe("morning");
    expect(daypartOf("12:00")).toBe("afternoon");
    expect(daypartOf("17:45")).toBe("afternoon");
    expect(daypartOf("18:00")).toBe("evening");
    expect(daypartOf("23:30")).toBe("evening");
  });
});

describe("computeInsights", () => {
  it("gives no insight below the data threshold (the UI shows an encouragement)", () => {
    expect(computeInsights([])).toEqual([]);
    expect(
      computeInsights([
        entry({ mood: "klid", intensity: 2 }),
        entry({ mood: "klid", intensity: 3 }),
      ]),
    ).toEqual([]);
    expect(tooFewDataText()).toMatch(/každý zápis pomáhá/);
  });

  it("names the most frequent mood and word in a descriptive sentence", () => {
    const entries = [
      entry({ mood: "napeti", intensity: 3, words: ["stress"] }),
      entry({ mood: "napeti", intensity: 4, words: ["stress", "worry"] }),
      entry({ mood: "klid", intensity: 2, words: ["pohoda"] }),
      entry({ mood: "napeti", intensity: 2, words: ["stress"] }),
    ];
    const insights = computeInsights(entries, "month");
    expect(insights[0].text).toBe(
      "Tenhle měsíc se nejčastěji objevuje napětí — nejčastěji se slovem „stres“.",
    );
    expect(insights[0].text).not.toMatch(/protože|kvůli/);
  });

  it("reports a tag and mood pair from 3 occurrences, with the instrumental case of a built-in tag", () => {
    const two = [
      entry({ mood: "napeti", intensity: 3, tags: ["school"] }),
      entry({ mood: "napeti", intensity: 4, tags: ["school"] }),
      entry({ mood: "klid", intensity: 2 }),
    ];
    expect(computeInsights(two).find((i) => i.id === "tag-mood")).toBeUndefined();

    const three = [...two, entry({ mood: "napeti", intensity: 3, tags: ["school"] })];
    const found = computeInsights(three, "month").find((i) => i.id === "tag-mood");
    expect(found?.text).toBe("Napětí se ti tenhle měsíc nejčastěji pojilo se školou.");
  });

  it("matches the participle to the gender of the mood and keeps a custom multi-word tag", () => {
    const entries = Array.from({ length: 3 }, () =>
      entry({ mood: "energie", intensity: 4, tags: ["dobrý spánek"] }),
    );
    const found = computeInsights(entries).find((i) => i.id === "tag-mood");
    expect(found?.text).toBe(
      "Energie se ti tenhle měsíc nejčastěji pojila se štítkem „dobrý spánek“.",
    );
  });

  it("reports a part-of-day pattern from 3 occurrences", () => {
    const entries = [
      entry({ mood: "utlum", intensity: 3, time: "21:00" }),
      entry({ mood: "utlum", intensity: 2, time: "22:15" }),
      entry({ mood: "utlum", intensity: 4, time: "19:40" }),
      entry({ mood: "klid", intensity: 2, time: "8:00" }),
    ];
    const found = computeInsights(entries).find((i) => i.id === "daypart");
    expect(found?.text).toBe("Večer se nejčastěji objevuje útlum.");
  });

  it("returns at most 3 insights", () => {
    const entries = Array.from({ length: 6 }, () =>
      entry({ mood: "napeti", intensity: 3, time: "20:00", words: ["stress"], tags: ["work"] }),
    );
    const insights = computeInsights(entries);
    expect(insights.length).toBeLessThanOrEqual(3);
    expect(insights.map((i) => i.id)).toEqual(["frequent", "tag-mood", "daypart"]);
    expect(insights.find((i) => i.id === "tag-mood")?.text).toMatch(/pojilo s prací/);
  });
});
