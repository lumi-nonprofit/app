/* UI nad insights: karta „Co se ukazuje“ v Přehledech (vzorce vs. málo dat)
   a Ohlédnutí za týdnem. Karta reflexe v Přehledech závisí na reálném dni
   v týdnu (okno neděle 17:00 → pondělí), proto se obrazovka testuje přímou
   routou /reflection. Data se sejí do DB před renderem (viz helpers/testDb),
   onboarding se přeskakuje zápisem profilu rovnou do settings. */
import { userEvent } from "@testing-library/react-native";
import { renderRouter, screen } from "expo-router/testing-library";
import { insertEntry, writeProfile } from "../src/db/repo";
import { TOO_FEW_DATA_TEXT } from "../src/features/stats/insights";
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

/** Onboarding rovnou v DB — UI testy začínají v tabech. */
function seedProfile(): void {
  writeProfile(getTestDb(), { onboarded: true, name: "Janko", age: "u26", share: false });
}

describe("Co se ukazuje (Přehledy)", () => {
  it("≥ 3 záznamy stejného stavu a štítku v týdnu → vzorce jsou vidět", async () => {
    seedProfile();
    const today = toISODate();
    for (let i = 0; i < 3; i++) {
      insertEntry(
        getTestDb(),
        entry({ date: today, mood: "napeti", words: ["stres"], tags: ["škola"] }),
      );
    }

    const user = userEvent.setup();
    await renderRouter("app");
    await user.press(await screen.findByRole("button", { name: "Přehledy" }));

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
    expect(screen.queryByText(TOO_FEW_DATA_TEXT)).toBeNull();
  });

  it("bez záznamů → jemné povzbuzení místo vzorců", async () => {
    seedProfile();
    const user = userEvent.setup();
    await renderRouter("app");
    await user.press(await screen.findByRole("button", { name: "Přehledy" }));

    expect(await screen.findByText("Co se ukazuje")).toBeOnTheScreen();
    expect(screen.getByText(TOO_FEW_DATA_TEXT)).toBeOnTheScreen();
  });
});

describe("Ohlédnutí za týdnem (/reflection)", () => {
  it("souhrn reflektovaného týdne: počet záznamů, slova, nálezy, klidné zakončení", async () => {
    seedProfile();
    const range = reflectionWeekRange(new Date());
    for (let i = 0; i < 3; i++) {
      insertEntry(
        getTestDb(),
        entry({ date: range.from, mood: "napeti", words: ["stres"], tags: ["škola"] }),
      );
    }

    await renderRouter("app", { initialUrl: "/reflection" });

    expect(await screen.findByText("Ohlédnutí")).toBeOnTheScreen();
    // v neděli „Tvůj týden“, jinak „Tvůj minulý týden“ — test nezná den spuštění
    expect(screen.getByRole("header", { name: /Tvůj (minulý )?týden/ })).toBeOnTheScreen();
    expect(screen.getByText(/3 záznamy/)).toBeOnTheScreen();
    expect(screen.getByText("Nejčastější slova")).toBeOnTheScreen();
    expect(screen.getByText("stres")).toBeOnTheScreen();
    expect(
      screen.getByText("Napětí se ti tenhle týden nejčastěji pojilo se školou."),
    ).toBeOnTheScreen();
    expect(screen.getByText("Ať byl týden jakýkoliv, díky, že si ho všímáš.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Zpět" })).toBeOnTheScreen();
  });

  it("prázdný týden: nulový počet bez viny, povzbuzení místo vzorců", async () => {
    seedProfile();
    await renderRouter("app", { initialUrl: "/reflection" });

    expect(await screen.findByText("Ohlédnutí")).toBeOnTheScreen();
    expect(screen.getByText(/0 záznamů/)).toBeOnTheScreen();
    expect(screen.getByText(TOO_FEW_DATA_TEXT)).toBeOnTheScreen();
    expect(screen.queryByText("Nejčastější slova")).toBeNull();
    expect(screen.getByText("Ať byl týden jakýkoliv, díky, že si ho všímáš.")).toBeOnTheScreen();
  });
});
