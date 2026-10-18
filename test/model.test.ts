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

/** Testovací záznam — doplní povinná pole, na kterých test nestojí. */
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
  it("declines days in Czech", () => {
    expect(i18n.t("common:counts.days", { count: 1 })).toBe("1 den");
    expect(i18n.t("common:counts.days", { count: 3 })).toBe("3 dny");
    expect(i18n.t("common:counts.days", { count: 11 })).toBe("11 dní");
  });
  it("gives the week from Monday in the active language", () => {
    expect(weekdayLetters()).toEqual(["Po", "Út", "St", "Čt", "Pá", "So", "Ne"]);
  });
});

describe("aggregateDay", () => {
  it("prázdný den → null", () => {
    expect(aggregateDay([])).toBeNull();
  });
  it("převažující stav, průměrná intenzita", () => {
    const agg = aggregateDay([
      entry({ mood: "klid", intensity: 2 }),
      entry({ mood: "napeti", intensity: 4 }),
      entry({ mood: "klid", intensity: 4 }),
    ]);
    expect(agg?.mood).toBe("klid");
    expect(agg?.intensity).toBe(3);
  });
  it("remíza → pozdější zápis vyhrává", () => {
    const agg = aggregateDay([
      entry({ mood: "klid", intensity: 3 }),
      entry({ mood: "utlum", intensity: 3 }),
    ]);
    expect(agg?.mood).toBe("utlum");
  });
});

describe("buildWeek", () => {
  it("označí dnešek a budoucí dny, záznam přiřadí správnému dni", () => {
    const today = new Date("2026-06-12T10:00:00"); // pátek
    const entries = [entry({ date: "2026-06-10", mood: "energie", intensity: 4 })];
    const week = buildWeek(entries, today);
    expect(week).toHaveLength(7);
    expect(week[4].today).toBe(true); // Pá
    expect(week[5].future).toBe(true); // So
    expect(week[2].entry).toEqual({ mood: "energie", intensity: 4 }); // St
    expect(week[0].entry).toBeNull();
  });
  it("počítá záznamy v aktuálním týdnu", () => {
    const today = new Date("2026-06-12T10:00:00");
    const entries = [
      entry({ date: "2026-06-08", mood: "klid", intensity: 2 }),
      entry({ date: "2026-06-01", mood: "klid", intensity: 2 }), // minulý týden — nepočítá se
    ];
    expect(weekEntryCount(entries, today)).toBe(1);
  });
});

describe("who5StatsText", () => {
  it("kadence 14 dní", () => {
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
