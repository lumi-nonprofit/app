import {
  aggregateDay,
  buildWeek,
  daysBetween,
  greeting,
  todayHeading,
  toISODate,
  weekEntryCount,
  weekdayLetters,
  who5StatsText,
  type Entry,
} from "../src/model";
import i18n from "../src/i18n";

/** A test entry: fills in the required fields that the test does not depend on. */
let seq = 0;
const entry = (e: Partial<Entry> & Pick<Entry, "mood" | "intensity">): Entry => ({
  id: `t${seq++}`,
  date: "2026-06-12",
  time: "9:00",
  words: [],
  tags: [],
  note: "",
  ...e,
});

describe("plural forms from the catalog", () => {
  it("declines entries in Czech", () => {
    expect(i18n.t("common:counts.entries", { count: 1 })).toBe("1 záznam");
    expect(i18n.t("common:counts.entries", { count: 3 })).toBe("3 záznamy");
    expect(i18n.t("common:counts.entries", { count: 11 })).toBe("11 záznamů");
  });
  it("gives the week from Monday in the active language", () => {
    expect(weekdayLetters()).toEqual(["Po", "Út", "St", "Čt", "Pá", "So", "Ne"]);
  });
});

describe("aggregateDay", () => {
  it("gives null for an empty day", () => {
    expect(aggregateDay([])).toBeNull();
  });
  it("gives the dominant state and the average intensity", () => {
    const agg = aggregateDay([
      entry({ mood: "klid", intensity: 2 }),
      entry({ mood: "napeti", intensity: 4 }),
      entry({ mood: "klid", intensity: 4 }),
    ]);
    expect(agg?.mood).toBe("klid");
    expect(agg?.intensity).toBe(3);
  });
  it("lets the later entry win a tie", () => {
    const agg = aggregateDay([
      entry({ mood: "klid", intensity: 3 }),
      entry({ mood: "utlum", intensity: 3 }),
    ]);
    expect(agg?.mood).toBe("utlum");
  });
});

describe("buildWeek", () => {
  it("marks today and the future days, and assigns the entry to the correct day", () => {
    const today = new Date("2026-06-12T10:00:00"); // Friday
    const entries = [entry({ date: "2026-06-10", mood: "energie", intensity: 4 })];
    const week = buildWeek(entries, today);
    expect(week).toHaveLength(7);
    expect(week[4].today).toBe(true); // Fri
    expect(week[5].future).toBe(true); // Sat
    expect(week[2].entry).toEqual({ mood: "energie", intensity: 4 }); // Wed
    expect(week[0].entry).toBeNull();
  });
  it("counts the entries in the current week", () => {
    const today = new Date("2026-06-12T10:00:00");
    const entries = [
      entry({ date: "2026-06-08", mood: "klid", intensity: 2 }),
      entry({ date: "2026-06-01", mood: "klid", intensity: 2 }), // last week, does not count
    ];
    expect(weekEntryCount(entries, today)).toBe(1);
  });
});

describe("who5StatsText", () => {
  it("uses a cadence of 14 days", () => {
    const today = new Date("2026-06-12T10:00:00");
    expect(who5StatsText([{ score: 68, date: "2026-06-09" }], today)).toBe(
      "Vyplněno před 3 dny. Další dotazník tě čeká za 11 dní.",
    );
    expect(who5StatsText([{ score: 68, date: toISODate(today) }], today)).toBe(
      "Vyplněno dnes. Další dotazník tě čeká za 14 dní.",
    );
    expect(who5StatsText([], today)).toBeNull();
  });
});

describe("daysBetween / greeting / todayHeading", () => {
  it("counts the days between ISO dates", () => {
    expect(daysBetween("2026-06-09", "2026-06-12")).toBe(3);
  });
  it("greets by the time of day, gender-neutral", () => {
    expect(greeting("Alex", new Date("2026-06-12T08:00:00"))).toBe("Dobré ráno, Alex");
    expect(greeting("Alex", new Date("2026-06-12T14:00:00"))).toBe("Dobré odpoledne, Alex");
    expect(greeting("Alex", new Date("2026-06-12T21:00:00"))).toBe("Dobrý večer, Alex");
    expect(greeting("", new Date("2026-06-12T21:00:00"))).toBe("Dobrý večer");
  });
  it("formats the day heading in the active language", () => {
    expect(todayHeading(new Date("2026-06-12T08:00:00"))).toBe("Pátek 12. června");
    void i18n.changeLanguage("en");
    expect(todayHeading(new Date("2026-06-12T08:00:00"))).toBe("Friday, June 12");
    expect(greeting("Alex", new Date("2026-06-12T08:00:00"))).toBe("Good morning, Alex");
    void i18n.changeLanguage("cs");
  });
});
