/* The UI above the insights: the card "Co se ukazuje" in the overview (patterns or too few
   data) and the weekly reflection. The reflection card in the overview depends on the real day
   of the week (the window from Sunday 17:00 to Monday), so the test opens the route /reflection
   directly. The data goes into the database before the render (see helpers/testDb); the test
   skips the onboarding with a profile written to the settings. */
import { userEvent } from "@testing-library/react-native";
import { renderRouter, screen } from "expo-router/testing-library";
import { insertEntry, writeProfile } from "../src/db/repo";
import { tooFewDataText } from "../src/features/stats/insights";
import { reflectionWeekRange } from "../src/features/stats/reflection";
import { toISODate, type Entry } from "../src/model";
import { getTestDb } from "./helpers/testDb";

let seq = 0;
const entry = (e: Partial<Entry> & Pick<Entry, "date" | "mood">): Entry => ({
  id: `${1770000000000 + seq}-ui${seq++}`,
  time: "8:30",
  intensity: 3,
  words: [],
  tags: [],
  note: "",
  ...e,
});

/** The onboarding goes directly into the database: the UI tests start in the tabs. */
function seedProfile(): void {
  writeProfile(getTestDb(), { onboarded: true, name: "Janko", age: "u26", share: false });
}

describe("What shows up (the overview)", () => {
  it("shows the patterns from 3 entries with the same mood and tag in a week", async () => {
    seedProfile();
    const today = toISODate();
    for (let i = 0; i < 3; i++) {
      insertEntry(
        getTestDb(),
        entry({ date: today, mood: "napeti", words: ["stress"], tags: ["school"] }),
      );
    }

    const user = userEvent.setup();
    await renderRouter("app");
    await user.press(await screen.findByRole("tab", { name: "Přehledy" }));

    expect(await screen.findByText("Co se ukazuje")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Tenhle týden se nejčastěji objevuje napětí — nejčastěji se slovem „stres“.",
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("Napětí se ti tenhle týden nejčastěji pojilo se školou."),
    ).toBeOnTheScreen();
    expect(screen.getByText("Ráno se nejčastěji objevuje napětí.")).toBeOnTheScreen();
    expect(screen.queryByText(tooFewDataText())).toBeNull();
  });

  it("shows a gentle encouragement instead of patterns without entries", async () => {
    seedProfile();
    const user = userEvent.setup();
    await renderRouter("app");
    await user.press(await screen.findByRole("tab", { name: "Přehledy" }));

    expect(await screen.findByText("Co se ukazuje")).toBeOnTheScreen();
    expect(screen.getByText(tooFewDataText())).toBeOnTheScreen();
  });
});

describe("Weekly reflection (/reflection)", () => {
  it("summarises the reflected week: entry count, words, insights, a calm closing", async () => {
    seedProfile();
    const range = reflectionWeekRange(new Date());
    for (let i = 0; i < 3; i++) {
      insertEntry(
        getTestDb(),
        entry({ date: range.from, mood: "napeti", words: ["stress"], tags: ["school"] }),
      );
    }

    await renderRouter("app", { initialUrl: "/reflection" });

    // On Sunday "Tvůj týden", otherwise "Tvůj minulý týden": the test does not know its day.
    expect(await screen.findByRole("header", { name: /Tvůj (minulý )?týden/ })).toBeOnTheScreen();
    expect(screen.getByText(/3 záznamy/)).toBeOnTheScreen();
    expect(screen.getByText("Nejčastější slova")).toBeOnTheScreen();
    expect(screen.getByText("stres")).toBeOnTheScreen();
    expect(
      screen.getByText("Napětí se ti tenhle týden nejčastěji pojilo se školou."),
    ).toBeOnTheScreen();
    expect(screen.getByText("Ať byl týden jakýkoliv, díky, že si ho všímáš.")).toBeOnTheScreen();
  });

  it("shows an empty week without guilt: a zero count and an encouragement", async () => {
    seedProfile();
    await renderRouter("app", { initialUrl: "/reflection" });

    expect(await screen.findByRole("header", { name: /Tvůj (minulý )?týden/ })).toBeOnTheScreen();
    expect(screen.getByText(/0 záznamů/)).toBeOnTheScreen();
    expect(screen.getByText(tooFewDataText())).toBeOnTheScreen();
    expect(screen.queryByText("Nejčastější slova")).toBeNull();
    expect(screen.getByText("Ať byl týden jakýkoliv, díky, že si ho všímáš.")).toBeOnTheScreen();
  });
});
