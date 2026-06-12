/* Průchod hlavními flow přes expo-router (skutečné routes z adresáře app/):
   onboarding → Dnes → check-in → potvrzení → Přehledy → Pomoc.
   Navigaci vlastní router — stav v AsyncStorage už žádnou `route` nemá. */
import { Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, userEvent } from "@testing-library/react-native";
import { renderRouter, screen } from "expo-router/testing-library";
import { STORE_KEY, type AppState } from "../src/store";

type User = ReturnType<typeof userEvent.setup>;

/** Stav se ukládá do AsyncStorage (asynchronní API, mock drží data v paměti). */
async function loadSaved(): Promise<AppState> {
  // `as string`: testy čtou až po uložení, klíč v mocku vždy existuje;
  // `as AppState`: JSON.parse vrací any, tvar dat odpovídá persistovanému stavu
  return JSON.parse((await AsyncStorage.getItem(STORE_KEY)) as string) as AppState;
}

async function finishOnboarding(user: User, name = "Janko"): Promise<void> {
  // hydratace z AsyncStorage je asynchronní — první obrazovka se objeví až po načtení
  expect(await screen.findByText("Ahoj, tady Lumi.")).toBeOnTheScreen();
  // CTA je neaktivní, dokud není jméno
  const next = screen.getByRole("button", { name: "Pokračovat" });
  expect(next).toBeDisabled();
  await user.type(screen.getByLabelText(/Jak ti máme říkat/), name);
  await user.press(screen.getByRole("button", { name: "Pokračovat" }));

  // věk — určuje primární krizovou linku
  expect(await screen.findByText("Kolik ti je?")).toBeOnTheScreen();
  await user.press(screen.getByRole("radio", { name: /do 26 let/ }));
  await user.press(screen.getByRole("button", { name: "Pokračovat" }));

  // soukromí
  expect(await screen.findByText("Tvoje data zůstávají u tebe")).toBeOnTheScreen();
  await user.press(screen.getByRole("button", { name: "Rozumím, jdeme na to" }));
  // Protected stack přesměruje na taby sám
  expect(await screen.findByText("Jak se dnes cítíš?")).toBeOnTheScreen();
}

describe("Lumi app", () => {
  it("projde onboardingem na Dnes; stav uloží bez `route`", async () => {
    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user);

    expect(screen.getByRole("header", { name: /Janko/ })).toBeOnTheScreen();
    // první den: výzva k prvnímu dotazníku místo procenta
    expect(screen.getByRole("button", { name: "Vyplnit první dotazník" })).toBeOnTheScreen();

    const saved = await loadSaved();
    expect(saved.onboarded).toBe(true);
    expect(saved.name).toBe("Janko");
    expect(saved.age).toBe("u26");
    // navigace patří routeru, ne storage
    expect(saved).not.toHaveProperty("route");
  });

  it("uloží check-in a ukáže potvrzení s kontextovým tipem", async () => {
    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user);

    await user.press(screen.getByRole("button", { name: "Začít check-in" }));
    expect(await screen.findByText("Jak se právě teď cítíš?")).toBeOnTheScreen();

    // „Pokračovat“ je neaktivní, dokud není vybrán stav
    expect(screen.getByRole("button", { name: "Pokračovat" })).toBeDisabled();
    await user.press(screen.getByRole("radio", { name: /Napětí/ }));
    await user.press(screen.getByRole("button", { name: "Pokračovat" }));

    // krok 2: slova (max 2), štítky, poznámka
    expect(await screen.findByText("Které slovo to vystihuje nejlíp?")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Uložit zápis" })).toBeDisabled();
    await user.press(screen.getByRole("button", { name: "stres" }));
    await user.press(screen.getByRole("button", { name: "obavy" }));
    await user.press(screen.getByRole("button", { name: "neklid" })); // třetí se už nevybere
    expect(screen.getByRole("button", { name: "neklid" })).not.toBeSelected();
    await user.press(screen.getByRole("button", { name: "škola" }));
    await user.press(screen.getByRole("button", { name: "Uložit zápis" }));

    // potvrzení — rodově neutrální, tip pro Napětí = Dech 4-7-8
    expect(await screen.findByText("Uloženo.")).toBeOnTheScreen();
    expect(screen.getByText(/Tohle byla chvilka pro tebe/)).toBeOnTheScreen();
    expect(screen.getByText("Dech 4-7-8")).toBeOnTheScreen();

    // zpět na Dnes — karta shrnuje dnešní zápis
    await user.press(screen.getByRole("button", { name: "Zpět na Dnes" }));
    expect(await screen.findByText(/Dnes zapsáno: Napětí · stres, obavy/)).toBeOnTheScreen();

    const saved = await loadSaved();
    expect(saved.entries).toHaveLength(1);
    expect(saved.entries[0]).toMatchObject({
      mood: "napeti",
      intensity: 3,
      words: ["stres", "obavy"],
      tags: ["škola"],
    });
  });

  it("krok 2 → zpět na krok 1 (router.back); draft zůstává", async () => {
    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user);

    await user.press(screen.getByRole("button", { name: "Začít check-in" }));
    expect(await screen.findByText("Jak se právě teď cítíš?")).toBeOnTheScreen();
    await user.press(screen.getByRole("radio", { name: /Klid/ }));
    await user.press(screen.getByRole("button", { name: "Pokračovat" }));
    expect(await screen.findByText("Které slovo to vystihuje nejlíp?")).toBeOnTheScreen();

    // zpět na krok 1 — výběr stavu zůstává (draft žije v provideru stacku)
    await user.press(screen.getByRole("button", { name: "Zpět na krok 1" }));
    expect(await screen.findByText("Jak se právě teď cítíš?")).toBeOnTheScreen();
    expect(screen.getByRole("radio", { name: /Klid/ })).toBeChecked();
  });

  it("Přehledy: prázdný týden bez viny, sdílení default vypnuto", async () => {
    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user);

    await user.press(screen.getByRole("button", { name: "Přehledy" }));
    expect(await screen.findByText("Tvůj týden")).toBeOnTheScreen();
    expect(screen.getByText(/Zatím tu toho moc není — každý zápis se počítá/)).toBeOnTheScreen();

    const share = screen.getByRole("switch", { name: "Sdílení vypnuto" });
    expect(share).not.toBeChecked();
    await fireEvent(share, "valueChange", true);
    expect(screen.getByRole("switch", { name: "Sdílení zapnuto" })).toBeChecked();
    expect((await loadSaved()).share).toBe(true);
  });

  it("Pomoc: primární linka podle věku, tel: odkazy, řádek 155/112", async () => {
    const user = userEvent.setup();
    // mockResolvedValue(undefined): TS vyžaduje argument, runtime je shodný s bezparametrickým voláním
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    await renderRouter("app");
    await finishOnboarding(user); // do 26 let

    await user.press(screen.getByRole("button", { name: "Pomoc" }));
    expect(await screen.findByText("Jsme tu s tebou")).toBeOnTheScreen();
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
    await renderRouter("app");
    await finishOnboarding(user);

    await user.press(screen.getByRole("button", { name: "Klid" }));
    expect(await screen.findByText("Na chvilku se zastav")).toBeOnTheScreen();
    expect(screen.getByText("Začneme?")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Začít dýchat" }));
    expect(screen.getByText("Nádech")).toBeOnTheScreen();
    expect(screen.getByText("4 s nádech · 4 s výdech")).toBeOnTheScreen();
  });
});
