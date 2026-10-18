/* The message catalogs: every id of the data modules has its text, both languages render, and
   the `content` namespace (which the extractor cannot see) is complete. */
import i18n, { SUPPORTED_LOCALES } from "../src/i18n";
import { contentText } from "../src/i18n/content";
import { resources } from "../src/i18n/resources";
import { formatPercent, formatTime } from "../src/i18n/format";
import { ALL_WORD_IDS, TAG_IDS } from "../src/db/vocab";
import { MOODS, RECOMMENDATIONS, intensityLabel, tagLabel, wordLabel } from "../src/model";
import { CALM_ACTIVITIES } from "../src/features/calm/content";
import { CONTACT_LINES, EMERGENCY_LINES } from "../src/features/help/lines";
import { PLAN_SECTIONS } from "../src/features/help/plan";
import { INSTRUMENTS } from "../src/features/measure/definitions";
import { gad7Band, phq9Band, trendText } from "../src/features/measure/scoring";

type Tree = { [key: string]: Tree | string };

function leaves(tree: Tree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "string" ? [`${prefix}${key}`] : leaves(value, `${prefix}${key}.`),
  );
}

afterEach(() => {
  void i18n.changeLanguage("cs");
});

describe("catalogs", () => {
  it("have the same keys in every locale", () => {
    const source = resources.cs as unknown as Record<string, Tree>;
    for (const locale of SUPPORTED_LOCALES) {
      const catalog = resources[locale] as unknown as Record<string, Tree>;
      for (const ns of Object.keys(source)) {
        const expected = leaves(source[ns]).filter((k) => !k.includes("_meta"));
        const actual = leaves(catalog[ns]).filter((k) => !k.includes("_meta"));
        // Plural forms differ by locale: compare the base keys only.
        const base = (keys: string[]) =>
          [...new Set(keys.map((k) => k.replace(/_(zero|one|two|few|many|other)$/, "")))].sort();
        expect({ locale, ns, keys: base(actual) }).toEqual({ locale, ns, keys: base(expected) });
      }
    }
  });

  it("render every data id in Czech and in English", () => {
    const check = () => {
      for (const mood of MOODS) {
        expect(mood.name).not.toBe("");
        expect(mood.nameInSentence).not.toBe("");
        expect(mood.axis).not.toBe("");
      }
      for (const id of ALL_WORD_IDS) expect(wordLabel(id)).not.toBe("");
      for (const id of TAG_IDS) expect(tagLabel(id)).not.toBe("");
      for (const level of [1, 2, 3, 4, 5] as const) expect(intensityLabel(level)).not.toBe("");
      for (const line of [...CONTACT_LINES, ...EMERGENCY_LINES]) {
        expect(line.name).not.toBe("");
        expect(line.nameDative).not.toBe("");
        expect(line.meta).not.toBe("");
      }
      for (const line of EMERGENCY_LINES) expect(line.short).not.toBe("");
      for (const rec of RECOMMENDATIONS) {
        expect(rec.title).not.toBe("");
        expect(rec.subtitle).not.toBe("");
      }
      for (const activity of CALM_ACTIVITIES) {
        expect(activity.title).not.toBe("");
        expect(activity.subtitle).not.toBe("");
        expect(activity.badge?.[1]).not.toBe("");
      }
      for (const section of PLAN_SECTIONS) {
        expect(section.title).not.toBe("");
        expect(section.subtitle).not.toBe("");
        expect(section.placeholder).not.toBe("");
      }
      expect(INSTRUMENTS.who5.questions).toHaveLength(5);
      expect(INSTRUMENTS.who5.options).toHaveLength(6);
      expect(INSTRUMENTS.phq9.questions).toHaveLength(9);
      expect(INSTRUMENTS.phq9.options).toHaveLength(4);
      expect(INSTRUMENTS.gad7.questions).toHaveLength(7);
      expect(INSTRUMENTS.gad7.options).toHaveLength(4);
      for (const inst of Object.values(INSTRUMENTS)) {
        expect(inst.title).not.toBe("");
        expect(inst.intro).not.toBe("");
        for (const q of inst.questions) expect(q).not.toBe("");
        for (const o of inst.options) expect(o.label).not.toBe("");
      }
      for (const score of [0, 5, 10, 15, 20]) {
        expect(phq9Band(score).label).not.toBe("");
        expect(phq9Band(score).text).not.toBe("");
      }
      for (const score of [0, 5, 10, 15]) {
        expect(gad7Band(score).label).not.toBe("");
        expect(gad7Band(score).text).not.toBe("");
      }
    };
    check();
    void i18n.changeLanguage("en");
    check();
  });

  it("keep the validation note of the instruments", () => {
    for (const type of ["who5", "phq9", "gad7"] as const) {
      expect(resources.cs.content.instruments[type]._meta.todo).toMatch(/validated Czech version/);
      expect(resources.en.content.instruments[type]._meta.source).toMatch(/original English/);
    }
  });
});

describe("languages", () => {
  it("switch the text of a data id", () => {
    expect(contentText("moods.napeti.name")).toBe("Napětí");
    for (const id of ALL_WORD_IDS) expect(wordLabel(id)).not.toBe(id);
    for (const id of TAG_IDS) expect(tagLabel(id)).not.toBe(id);
    expect(wordLabel("stress")).toBe("stres");
    expect(tagLabel("school")).toBe("škola");
    void i18n.changeLanguage("en");
    expect(contentText("moods.napeti.name")).toBe("Tension");
    expect(wordLabel("stress")).toBe("stress");
    expect(tagLabel("school")).toBe("school");
  });

  it("keep a custom tag as typed", () => {
    expect(tagLabel("terapie")).toBe("terapie");
    void i18n.changeLanguage("en");
    expect(tagLabel("terapie")).toBe("terapie");
  });

  it("use the plural forms of the locale", () => {
    expect(trendText(5, 2)).toBe("O 3 body víc než minule.");
    expect(trendText(5, 4)).toBe("O 1 bod víc než minule.");
    expect(trendText(2, 7)).toBe("O 5 bodů míň než minule.");
    expect(trendText(56, 44, "percent")).toBe("O 12 % víc než minule.");
    void i18n.changeLanguage("en");
    expect(trendText(5, 2)).toBe("3 points more than last time.");
    expect(trendText(5, 4)).toBe("1 point more than last time.");
    expect(trendText(56, 44, "percent")).toBe("12% more than last time.");
  });

  it("format time and percent with Intl", () => {
    expect(formatTime({ hour: 19, minute: 0 })).toBe("19:00");
    expect(formatPercent(72)).toBe("72 %");
    void i18n.changeLanguage("en");
    expect(formatTime({ hour: 19, minute: 0 })).toBe("7:00 PM");
    expect(formatPercent(72)).toBe("72%");
  });
});
