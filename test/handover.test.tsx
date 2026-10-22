/* Handover of the phone (/handover): a full-screen mode for a third person. The screen opens
   only from Help (the test does not wire that up), so the test seeds an onboarded profile into
   the shared database and renders the route directly: DbProvider reads the same instance and
   skips the onboarding. The key point: no personal data (the name "Janko" must not appear). */
import { Linking } from "react-native";
import { userEvent } from "@testing-library/react-native";
import { renderRouter, screen } from "expo-router/testing-library";
import { writeProfile } from "../src/db/repo";
import { getTestDb } from "./helpers/testDb";

describe("Handover of the phone (/handover)", () => {
  it("shows the principles and the crisis lines, without personal data", async () => {
    const user = userEvent.setup();
    // mockResolvedValue(undefined): TypeScript wants an argument; the runtime is the same as a call without one.
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    writeProfile(getTestDb(), { onboarded: true, name: "Janko", age: "u26", share: false });
    await renderRouter("app", { initialUrl: "/handover" });

    // The heading and at least one principle are visible.
    expect(
      await screen.findByText("Jste tu pro někoho — to je to nejdůležitější."),
    ).toBeOnTheScreen();
    expect(screen.getByText("Hlavně poslouchejte.")).toBeOnTheScreen();

    // No personal data: the name from the profile must not appear on the screen.
    expect(screen.queryByText(/Janko/)).toBeNull();

    // Both crisis lines call through the openURL spy with the fixed number.
    await user.press(screen.getByRole("link", { name: /Zavolat 116 123 — dospělí/ }));
    expect(openURL).toHaveBeenCalledWith("tel:116123");
    await user.press(screen.getByRole("link", { name: /Zavolat 116 111 — děti a studenti/ }));
    expect(openURL).toHaveBeenCalledWith("tel:116111");

    // The emergency row 155/112 in high contrast.
    expect(screen.getByText(/155 záchranná služba · 112 tísňová linka/)).toBeOnTheScreen();
  });

  it("opens from Help, and the return button leads back to Help", async () => {
    const user = userEvent.setup();
    writeProfile(getTestDb(), { onboarded: true, name: "Janko", age: "u26", share: false });
    await renderRouter("app", { initialUrl: "/help" });

    expect(await screen.findByText("Pomoc je blízko")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: /Pomáháš někomu blízkému/ }));

    // The handover opened through Help, so there is a screen to go back to.
    expect(
      await screen.findByText("Jste tu pro někoho — to je to nejdůležitější."),
    ).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Vrátit telefon" }));
    expect(await screen.findByText("Pomoc je blízko")).toBeOnTheScreen();
  });
});
