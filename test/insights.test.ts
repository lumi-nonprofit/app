/* Lokální insights: prahy (≥ 3 výskyty), deskriptivní formulace,
   česká shoda příčestí se stavem a instrumentál štítků. */
import { computeInsights, daypartOf, TOO_FEW_DATA_TEXT } from "../src/features/stats/insights";
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
  it("hranice ráno/odpoledne/večer", () => {
    expect(daypartOf("0:15")).toBe("ráno");
    expect(daypartOf("11:59")).toBe("ráno");
    expect(daypartOf("12:00")).toBe("odpoledne");
    expect(daypartOf("17:45")).toBe("odpoledne");
    expect(daypartOf("18:00")).toBe("večer");
    expect(daypartOf("23:30")).toBe("večer");
  });
});

describe("computeInsights", () => {
  it("pod prahem dat → žádné nálezy (UI ukazuje povzbuzení)", () => {
    expect(computeInsights([])).toEqual([]);
    expect(
      computeInsights([
        entry({ mood: "klid", intensity: 2 }),
        entry({ mood: "klid", intensity: 3 }),
      ]),
    ).toEqual([]);
    expect(TOO_FEW_DATA_TEXT).toMatch(/každý zápis pomáhá/);
  });

  it("nejčastější stav a slovo — deskriptivně", () => {
    const entries = [
      entry({ mood: "napeti", intensity: 3, words: ["stres"] }),
      entry({ mood: "napeti", intensity: 4, words: ["stres", "obavy"] }),
      entry({ mood: "klid", intensity: 2, words: ["pohoda"] }),
      entry({ mood: "napeti", intensity: 2, words: ["stres"] }),
    ];
    const insights = computeInsights(entries, "Tenhle měsíc");
    expect(insights[0].text).toBe(
      "Tenhle měsíc se nejčastěji objevuje napětí — nejčastěji se slovem „stres“.",
    );
    expect(insights[0].text).not.toMatch(/protože|kvůli/);
  });

  it("ko-výskyt štítek×stav až od 3 výskytů, instrumentál pro vestavěné", () => {
    const two = [
      entry({ mood: "napeti", intensity: 3, tags: ["škola"] }),
      entry({ mood: "napeti", intensity: 4, tags: ["škola"] }),
      entry({ mood: "klid", intensity: 2 }),
    ];
    expect(computeInsights(two).find((i) => i.id === "tag-mood")).toBeUndefined();

    const three = [...two, entry({ mood: "napeti", intensity: 3, tags: ["škola"] })];
    const found = computeInsights(three, "Tenhle měsíc").find((i) => i.id === "tag-mood");
    expect(found?.text).toBe("Napětí se ti tenhle měsíc nejčastěji pojilo se školou.");
  });

  it("shoda příčestí podle rodu stavu + vlastní víceslovný štítek", () => {
    const entries = Array.from({ length: 3 }, () =>
      entry({ mood: "energie", intensity: 4, tags: ["dobrý spánek"] }),
    );
    const found = computeInsights(entries).find((i) => i.id === "tag-mood");
    expect(found?.text).toBe(
      "Energie se ti tenhle měsíc nejčastěji pojila se štítkem „dobrý spánek“.",
    );
  });

  it("vzorec denní doby od 3 výskytů", () => {
    const entries = [
      entry({ mood: "utlum", intensity: 3, time: "21:00" }),
      entry({ mood: "utlum", intensity: 2, time: "22:15" }),
      entry({ mood: "utlum", intensity: 4, time: "19:40" }),
      entry({ mood: "klid", intensity: 2, time: "8:00" }),
    ];
    const found = computeInsights(entries).find((i) => i.id === "daypart");
    expect(found?.text).toBe("Večer se nejčastěji objevuje útlum.");
  });

  it("maximálně 3 nálezy", () => {
    const entries = Array.from({ length: 6 }, () =>
      entry({ mood: "napeti", intensity: 3, time: "20:00", words: ["stres"], tags: ["práce"] }),
    );
    const insights = computeInsights(entries);
    expect(insights.length).toBeLessThanOrEqual(3);
    expect(insights.map((i) => i.id)).toEqual(["frequent", "tag-mood", "daypart"]);
    expect(insights.find((i) => i.id === "tag-mood")?.text).toMatch(/pojilo s prací/);
  });
});
