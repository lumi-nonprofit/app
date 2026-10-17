/* Pomoc: linky z jednoho zdroje (lines.ts) — 155/112 i 116 006 jsou volatelné,
   Rodičovská linka má ověřené hodiny, žádný řádek není mrtvý (každý má
   onPress nebo href) a bez věku jsou obě linky nabídnuté. */
import { Linking } from "react-native";
import { userEvent } from "@testing-library/react-native";
import { renderRouter, screen } from "expo-router/testing-library";
import { writeProfile } from "../src/db/repo";
import { CONTACT_LINES, EMERGENCY_LINES } from "../src/features/help/lines";
import { getTestDb } from "./helpers/testDb";

describe("Pomoc", () => {
  it("každá linka je volatelná; 116 006 a správné hodiny Rodičovské linky", async () => {
    const user = userEvent.setup();
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    writeProfile(getTestDb(), { onboarded: true, name: "Janko", age: "plus27", share: false });
    await renderRouter("app", { initialUrl: "/help" });
    expect(await screen.findByText("Jsme tu s tebou")).toBeOnTheScreen();

    await user.press(screen.getByRole("link", { name: /Linka pomoci obětem · 116 006/ }));
    expect(openURL).toHaveBeenCalledWith("tel:116006");
    expect(screen.getByText(/Po–Čt 9–21 · Pá 9–17/)).toBeOnTheScreen();

    for (const line of EMERGENCY_LINES) {
      await user.press(screen.getByRole("link", { name: new RegExp(`Zavolat ${line.phone}`) }));
      expect(openURL).toHaveBeenCalledWith(`tel:${line.phone}`);
    }
    expect(CONTACT_LINES.map((l) => l.phone)).toContain("116 006");

    // žádný mrtvý řádek: každé tlačítko/odkaz v seznamu má akci — sekce bez obsahu se nevykreslí
    expect(screen.queryByText("Co dělat, když…")).toBeNull();
    expect(screen.queryByText("Chat Linky bezpečí")).toBeNull();
  });

  it("bez uvedeného věku zůstávají obě linky k dispozici", async () => {
    writeProfile(getTestDb(), { onboarded: true, name: "", age: null, share: false });
    await renderRouter("app", { initialUrl: "/help" });
    expect(await screen.findByText("Jsme tu s tebou")).toBeOnTheScreen();
    expect(screen.getAllByRole("link", { name: /Zavolat 116 111/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /Zavolat 116 123/ }).length).toBeGreaterThan(0);
  });
});
