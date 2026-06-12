/* Průchod hlavními flow: onboarding → Dnes → check-in → potvrzení → Přehledy → Pomoc. */
import React from "react";
import { Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen, userEvent } from "@testing-library/react-native";
import App from "../src/App.jsx";
import { STORE_KEY } from "../src/store.js";

/** Stav se ukládá do AsyncStorage (asynchronní API, mock drží data v paměti). */
async function loadSaved() {
  return JSON.parse(await AsyncStorage.getItem(STORE_KEY));
}

async function finishOnboarding(user, name = "Janko") {
  // hydratace z AsyncStorage je asynchronní — první obrazovka se objeví až po načtení
  expect(await screen.findByText("Ahoj, tady Lumi.")).toBeOnTheScreen();
  // CTA je neaktivní, dokud není jméno
  const next = screen.getByRole("button", { name: "Pokračovat" });
  expect(next).toBeDisabled();
  await user.type(screen.getByLabelText(/Jak ti máme říkat/), name);
  await user.press(screen.getByRole("button", { name: "Pokračovat" }));

  // věk — určuje primární krizovou linku
  expect(screen.getByText("Kolik ti je?")).toBeOnTheScreen();
  await user.press(screen.getByRole("radio", { name: /do 26 let/ }));
  await user.press(screen.getByRole("button", { name: "Pokračovat" }));

  // soukromí
  expect(screen.getByText("Tvoje data zůstávají u tebe")).toBeOnTheScreen();
  await user.press(screen.getByRole("button", { name: "Rozumím, jdeme na to" }));
}

describe("Lumi app", () => {
  it("projde onboardingem na Dnes a stav uloží", async () => {
    const user = userEvent.setup();
    await render(<App />);
    await finishOnboarding(user);

    expect(screen.getByRole("header", { name: /Janko/ })).toBeOnTheScreen();
    expect(screen.getByText("Jak se dnes cítíš?")).toBeOnTheScreen();
    // první den: výzva k prvnímu dotazníku místo procenta
    expect(screen.getByRole("button", { name: "Vyplnit první dotazník" })).toBeOnTheScreen();

    const saved = await loadSaved();
    expect(saved.onboarded).toBe(true);
    expect(saved.name).toBe("Janko");
    expect(saved.age).toBe("u26");
  });

  it("uloží check-in a ukáže potvrzení s kontextovým tipem", async () => {
    const user = userEvent.setup();
    await render(<App />);
    await finishOnboarding(user);

    await user.press(screen.getByRole("button", { name: "Začít check-in" }));
    expect(screen.getByText("Jak se právě teď cítíš?")).toBeOnTheScreen();

    // „Pokračovat“ je neaktivní, dokud není vybrán stav
    expect(screen.getByRole("button", { name: "Pokračovat" })).toBeDisabled();
    await user.press(screen.getByRole("radio", { name: /Napětí/ }));
    await user.press(screen.getByRole("button", { name: "Pokračovat" }));

    // krok 2: slova (max 2), štítky, poznámka
    expect(screen.getByText("Které slovo to vystihuje nejlíp?")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Uložit zápis" })).toBeDisabled();
    await user.press(screen.getByRole("button", { name: "stres" }));
    await user.press(screen.getByRole("button", { name: "obavy" }));
    await user.press(screen.getByRole("button", { name: "neklid" })); // třetí se už nevybere
    expect(screen.getByRole("button", { name: "neklid" })).not.toBeSelected();
    await user.press(screen.getByRole("button", { name: "škola" }));
    await user.press(screen.getByRole("button", { name: "Uložit zápis" }));

    // potvrzení — rodově neutrální, tip pro Napětí = Dech 4-7-8
    expect(screen.getByText("Uloženo.")).toBeOnTheScreen();
    expect(screen.getByText(/Tohle byla chvilka pro tebe/)).toBeOnTheScreen();
    expect(screen.getByText("Dech 4-7-8")).toBeOnTheScreen();

    // zpět na Dnes — karta shrnuje dnešní zápis
    await user.press(screen.getByRole("button", { name: "Zpět na Dnes" }));
    expect(screen.getByText(/Dnes zapsáno: Napětí · stres, obavy/)).toBeOnTheScreen();

    const saved = await loadSaved();
    expect(saved.entries).toHaveLength(1);
    expect(saved.entries[0]).toMatchObject({ mood: "napeti", intensity: 3, words: ["stres", "obavy"], tags: ["škola"] });
  });

  it("Přehledy: prázdný týden bez viny, sdílení default vypnuto", async () => {
    const user = userEvent.setup();
    await render(<App />);
    await finishOnboarding(user);

    await user.press(screen.getByRole("button", { name: "Přehledy" }));
    expect(screen.getByText("Tvůj týden")).toBeOnTheScreen();
    expect(screen.getByText(/Zatím tu toho moc není — každý zápis se počítá/)).toBeOnTheScreen();

    const share = screen.getByRole("switch", { name: "Sdílení vypnuto" });
    expect(share).not.toBeChecked();
    await fireEvent(share, "valueChange", true);
    expect(screen.getByRole("switch", { name: "Sdílení zapnuto" })).toBeChecked();
    expect((await loadSaved()).share).toBe(true);
  });

  it("Pomoc: primární linka podle věku, tel: odkazy, řádek 155/112", async () => {
    const user = userEvent.setup();
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue();
    await render(<App />);
    await finishOnboarding(user); // do 26 let

    await user.press(screen.getByRole("button", { name: "Pomoc" }));
    expect(screen.getByText("Jsme tu s tebou")).toBeOnTheScreen();
    expect(screen.getByText("tvoje linka")).toBeOnTheScreen();

    // tel: odkazy se v RN otevírají přes Linking.openURL
    const call116111 = screen.getAllByRole("link", { name: /Zavolat 116 111/ })[0];
    await user.press(call116111);
    expect(openURL).toHaveBeenCalledWith("tel:116111");
    await user.press(screen.getByRole("link", { name: /Zavolat 116 123/ }));
    expect(openURL).toHaveBeenCalledWith("tel:116123");
    expect(screen.getByText(/volej 155 nebo 112/)).toBeOnTheScreen();
  });

  it("Klid: dechový kruh se spouští klepnutím („Začneme?“)", async () => {
    const user = userEvent.setup();
    await render(<App />);
    await finishOnboarding(user);

    await user.press(screen.getByRole("button", { name: "Klid" }));
    expect(screen.getByText("Na chvilku se zastav")).toBeOnTheScreen();
    expect(screen.getByText("Začneme?")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Začít dýchat" }));
    expect(screen.getByText("Nádech")).toBeOnTheScreen();
    expect(screen.getByText("4 s nádech · 4 s výdech")).toBeOnTheScreen();
  });
});
