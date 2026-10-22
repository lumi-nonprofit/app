/* The crisis plan from Help: the editor saves a section into the database and the subtitle gets
   "· vyplněno"; the print of an empty card leads to a prompt to fill the plan in first. */
import { Alert } from "react-native";
import { userEvent } from "@testing-library/react-native";
import { renderRouter, screen } from "expo-router/testing-library";
import { getSetting } from "../src/db/repo";
import { PLAN_SECTION_KEYS } from "../src/features/help/plan";
import { writeProfile } from "../src/db/repo";
import { getTestDb } from "./helpers/testDb";

describe("Crisis plan", () => {
  it("saves the edit of a section and marks the subtitle as filled in", async () => {
    const user = userEvent.setup();
    writeProfile(getTestDb(), { onboarded: true, name: "Janko", age: "u26", share: false });
    await renderRouter("app", { initialUrl: "/help" });

    expect(await screen.findByText("Pomoc je blízko")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: /Moje varovné signály/ }));

    // The editor of the section.
    expect(await screen.findByText("Moje varovné signály")).toBeOnTheScreen();
    await user.type(screen.getByLabelText(/Moje varovné signály/), "nespavost, stažení se");
    await user.press(screen.getByRole("button", { name: "Uložit" }));

    // Back on Help: the section is now filled in, the value is in the database.
    expect(
      await screen.findByText(/Podle čeho poznám, že se to horší · vyplněno/),
    ).toBeOnTheScreen();
    expect(getSetting<string>(getTestDb(), PLAN_SECTION_KEYS.signals)).toBe(
      "nespavost, stažení se",
    );
  });

  it("asks to fill the plan in first when the card is empty", async () => {
    const user = userEvent.setup();
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    writeProfile(getTestDb(), { onboarded: true, name: "Janko", age: "u26", share: false });
    await renderRouter("app", { initialUrl: "/help" });

    await user.press(await screen.findByRole("button", { name: /Vytisknout kartičku/ }));
    // `notify` gives Alert.alert one button and the dismiss options after the texts.
    expect(alertSpy).toHaveBeenCalledWith(
      "Nejdřív si plán vyplň",
      expect.stringContaining("vyplň aspoň jednu část"),
      expect.any(Array),
      expect.any(Object),
    );
  });
});
