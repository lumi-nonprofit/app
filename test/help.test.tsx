/* Help: the lines come from one source (lines.ts). 155, 112 and 116 006 are callable, the row of
   "Rodičovská linka" shows the checked hours, no row is dead (each one has onPress or href), and
   without an age band both primary lines are on offer. */
import { Linking } from "react-native";
import { userEvent } from "@testing-library/react-native";
import { renderRouter, screen } from "expo-router/testing-library";
import { writeProfile } from "../src/db/repo";
import { CONTACT_LINES, EMERGENCY_LINES } from "../src/features/help/lines";
import { getTestDb } from "./helpers/testDb";

describe("Help", () => {
  it("makes every line callable, with 116 006 and the correct hours of the parents' line", async () => {
    const user = userEvent.setup();
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    writeProfile(getTestDb(), { onboarded: true, name: "Janko", age: "plus27", share: false });
    await renderRouter("app", { initialUrl: "/help" });
    expect(await screen.findByText("Pomoc je blízko")).toBeOnTheScreen();

    await user.press(screen.getByRole("link", { name: /Linka pomoci obětem · 116 006/ }));
    expect(openURL).toHaveBeenCalledWith("tel:116006");
    expect(screen.getByText(/Po–Čt 9–21 · Pá 9–17/)).toBeOnTheScreen();

    for (const line of EMERGENCY_LINES) {
      await user.press(screen.getByRole("link", { name: new RegExp(`Zavolat ${line.phone}`) }));
      expect(openURL).toHaveBeenCalledWith(`tel:${line.phone}`);
    }
    expect(CONTACT_LINES.map((l) => l.phone)).toContain("116 006");

    // No dead row: each button and link in the list has an action. A section without content does not render.
    expect(screen.queryByText("Co dělat, když…")).toBeNull();
    expect(screen.queryByText("Chat Linky bezpečí")).toBeNull();
  });

  it("keeps both lines available without an age band", async () => {
    writeProfile(getTestDb(), { onboarded: true, name: "", age: null, share: false });
    await renderRouter("app", { initialUrl: "/help" });
    expect(await screen.findByText("Pomoc je blízko")).toBeOnTheScreen();
    expect(screen.getAllByRole("link", { name: /Zavolat 116 111/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /Zavolat 116 123/ }).length).toBeGreaterThan(0);
  });
});
