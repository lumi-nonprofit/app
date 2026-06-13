/* Předání telefonu (/handover): celoobrazovkový režim pro třetí osobu.
   Obrazovka je dostupná jen z Pomoci (ta zatím není v testu nadrátovaná),
   takže onboardovaný profil naseedujeme přímo do sdílené DB a vyrenderujeme
   rovnou na routě — DbProvider čte tutéž instanci, onboarding se přeskočí.
   Klíčové: žádná osobní data (jméno „Janko“ se nesmí nikde objevit). */
import { Linking } from "react-native";
import { userEvent } from "@testing-library/react-native";
import { renderRouter, screen } from "expo-router/testing-library";
import { writeProfile } from "../src/db/repo";
import { getTestDb } from "./helpers/testDb";

describe("Předání telefonu (/handover)", () => {
  it("ukáže principy a krizové linky, žádná osobní data", async () => {
    const user = userEvent.setup();
    // mockResolvedValue(undefined): TS vyžaduje argument, runtime je shodný s bezparametrickým voláním
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    writeProfile(getTestDb(), { onboarded: true, name: "Janko", age: "u26", share: false });
    await renderRouter("app", { initialUrl: "/handover" });

    // nadpis + alespoň jeden princip jsou vidět
    expect(
      await screen.findByText("Jste tu pro někoho — to je to nejdůležitější."),
    ).toBeOnTheScreen();
    expect(screen.getByText("Hlavně poslouchejte.")).toBeOnTheScreen();

    // žádná osobní data — jméno z profilu se na obrazovce nesmí objevit
    expect(screen.queryByText(/Janko/)).toBeNull();

    // obě krizové linky volají přes Linking.openURL s napevno daným číslem
    await user.press(screen.getByRole("link", { name: /Zavolat 116 123 — dospělí/ }));
    expect(openURL).toHaveBeenCalledWith("tel:116123");
    await user.press(screen.getByRole("link", { name: /Zavolat 116 111 — děti a studenti/ }));
    expect(openURL).toHaveBeenCalledWith("tel:116111");

    // nouzový řádek 155/112 ve vysokém kontrastu
    expect(screen.getByText(/155 záchranná služba · 112 tísňová linka/)).toBeOnTheScreen();
  });

  it("z Pomoci se otevře a „Vrátit telefon“ vrací zpět na Pomoc", async () => {
    const user = userEvent.setup();
    writeProfile(getTestDb(), { onboarded: true, name: "Janko", age: "u26", share: false });
    await renderRouter("app", { initialUrl: "/help" });

    expect(await screen.findByText("Jsme tu s tebou")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: /Pomáháš někomu blízkému/ }));

    // handover otevřen přes Pomoc → existuje kam se vrátit
    expect(
      await screen.findByText("Jste tu pro někoho — to je to nejdůležitější."),
    ).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Vrátit telefon" }));
    expect(await screen.findByText("Jsme tu s tebou")).toBeOnTheScreen();
  });
});
