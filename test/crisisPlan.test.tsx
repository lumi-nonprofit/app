/* Krizový plán z Pomoci: editace sekce se uloží do DB a podtitulek dostane
   „· vyplněno“; tisk prázdné kartičky vede na výzvu k vyplnění. */
import { Alert } from "react-native";
import { userEvent } from "@testing-library/react-native";
import { renderRouter, screen } from "expo-router/testing-library";
import { getSetting } from "../src/db/repo";
import { PLAN_SECTION_KEYS } from "../src/features/help/plan";
import { writeProfile } from "../src/db/repo";
import { getTestDb } from "./helpers/testDb";

describe("Krizový plán", () => {
  it("editace sekce se uloží a podtitulek ukáže „vyplněno“", async () => {
    const user = userEvent.setup();
    writeProfile(getTestDb(), { onboarded: true, name: "Janko", age: "u26", share: false });
    await renderRouter("app", { initialUrl: "/help" });

    expect(await screen.findByText("Jsme tu s tebou")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: /Moje varovné signály/ }));

    // editor sekce
    expect(await screen.findByText("Moje varovné signály")).toBeOnTheScreen();
    await user.type(screen.getByLabelText(/Moje varovné signály/), "nespavost, stažení se");
    await user.press(screen.getByRole("button", { name: "Uložit" }));

    // zpět na Pomoci — sekce je teď „vyplněno“, hodnota je v DB
    expect(
      await screen.findByText(/Podle čeho poznám, že se to horší · vyplněno/),
    ).toBeOnTheScreen();
    expect(getSetting<string>(getTestDb(), PLAN_SECTION_KEYS.signals)).toBe(
      "nespavost, stažení se",
    );
  });

  it("tisk kartičky bez plánu nabídne nejdřív vyplnění", async () => {
    const user = userEvent.setup();
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    writeProfile(getTestDb(), { onboarded: true, name: "Janko", age: "u26", share: false });
    await renderRouter("app", { initialUrl: "/help" });

    await user.press(await screen.findByRole("button", { name: /Vytisknout kartičku/ }));
    expect(alertSpy).toHaveBeenCalledWith(
      "Nejdřív si plán vyplň",
      expect.stringContaining("vyplň aspoň jednu část"),
    );
  });
});
