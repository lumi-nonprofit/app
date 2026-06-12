/* Průchod hlavními flow: onboarding → Dnes → check-in → potvrzení → Přehledy → Pomoc. */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App.jsx";
import { STORE_KEY } from "../src/store.js";

async function finishOnboarding(user, name = "Janko") {
  expect(screen.getByText("Ahoj, tady Lumi.")).toBeInTheDocument();
  // CTA je neaktivní, dokud není jméno
  const next = screen.getByRole("button", { name: "Pokračovat" });
  expect(next).toHaveAttribute("aria-disabled", "true");
  await user.type(screen.getByLabelText(/Jak ti máme říkat/), name);
  await user.click(screen.getByRole("button", { name: "Pokračovat" }));

  // věk — určuje primární krizovou linku
  expect(screen.getByText("Kolik ti je?")).toBeInTheDocument();
  await user.click(screen.getByRole("radio", { name: /do 26 let/ }));
  await user.click(screen.getByRole("button", { name: "Pokračovat" }));

  // soukromí
  expect(screen.getByText("Tvoje data zůstávají u tebe")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Rozumím, jdeme na to" }));
}

describe("Lumi app", () => {
  it("projde onboardingem na Dnes a stav uloží", async () => {
    const user = userEvent.setup();
    render(<App />);
    await finishOnboarding(user);

    expect(screen.getByRole("heading", { name: /Janko/ })).toBeInTheDocument();
    expect(screen.getByText("Jak se dnes cítíš?")).toBeInTheDocument();
    // první den: výzva k prvnímu dotazníku místo procenta
    expect(screen.getByRole("button", { name: "Vyplnit první dotazník" })).toBeInTheDocument();

    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    expect(saved.onboarded).toBe(true);
    expect(saved.name).toBe("Janko");
    expect(saved.age).toBe("u26");
  });

  it("uloží check-in a ukáže potvrzení s kontextovým tipem", async () => {
    const user = userEvent.setup();
    render(<App />);
    await finishOnboarding(user);

    await user.click(screen.getByRole("button", { name: "Začít check-in" }));
    expect(screen.getByText("Jak se právě teď cítíš?")).toBeInTheDocument();

    // „Pokračovat“ je neaktivní, dokud není vybrán stav
    expect(screen.getByRole("button", { name: "Pokračovat" })).toHaveAttribute("aria-disabled", "true");
    await user.click(screen.getByRole("radio", { name: /Napětí/ }));
    await user.click(screen.getByRole("button", { name: "Pokračovat" }));

    // krok 2: slova (max 2), štítky, poznámka
    expect(screen.getByText("Které slovo to vystihuje nejlíp?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Uložit zápis" })).toHaveAttribute("aria-disabled", "true");
    await user.click(screen.getByRole("button", { name: "stres" }));
    await user.click(screen.getByRole("button", { name: "obavy" }));
    await user.click(screen.getByRole("button", { name: "neklid" })); // třetí se už nevybere
    expect(screen.getByRole("button", { name: "neklid" })).toHaveAttribute("aria-pressed", "false");
    await user.click(screen.getByRole("button", { name: "škola" }));
    await user.click(screen.getByRole("button", { name: "Uložit zápis" }));

    // potvrzení — rodově neutrální, tip pro Napětí = Dech 4-7-8
    expect(screen.getByText("Uloženo.")).toBeInTheDocument();
    expect(screen.getByText(/Tohle byla chvilka pro tebe/)).toBeInTheDocument();
    expect(screen.getByText("Dech 4-7-8")).toBeInTheDocument();

    // zpět na Dnes — karta shrnuje dnešní zápis
    await user.click(screen.getByRole("button", { name: "Zpět na Dnes" }));
    expect(screen.getByText(/Dnes zapsáno: Napětí · stres, obavy/)).toBeInTheDocument();

    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    expect(saved.entries).toHaveLength(1);
    expect(saved.entries[0]).toMatchObject({ mood: "napeti", intensity: 3, words: ["stres", "obavy"], tags: ["škola"] });
  });

  it("Přehledy: prázdný týden bez viny, sdílení default vypnuto", async () => {
    const user = userEvent.setup();
    render(<App />);
    await finishOnboarding(user);

    await user.click(screen.getByRole("button", { name: "Přehledy" }));
    expect(screen.getByText("Tvůj týden")).toBeInTheDocument();
    expect(screen.getByText(/Zatím tu toho moc není — každý zápis se počítá/)).toBeInTheDocument();

    const share = screen.getByRole("checkbox", { name: "Sdílení vypnuto" });
    expect(share).not.toBeChecked();
    await user.click(share);
    expect(screen.getByRole("checkbox", { name: "Sdílení zapnuto" })).toBeChecked();
    expect(JSON.parse(localStorage.getItem(STORE_KEY)).share).toBe(true);
  });

  it("Pomoc: primární linka podle věku, tel: odkazy, řádek 155/112", async () => {
    const user = userEvent.setup();
    render(<App />);
    await finishOnboarding(user); // do 26 let

    await user.click(screen.getByRole("button", { name: "Pomoc" }));
    expect(screen.getByText("Jsme tu s tebou")).toBeInTheDocument();
    expect(screen.getByText("tvoje linka")).toBeInTheDocument();

    const call116111 = screen.getAllByRole("link", { name: /Zavolat 116 111/ })[0];
    expect(call116111).toHaveAttribute("href", "tel:116111");
    expect(screen.getByRole("link", { name: /Zavolat 116 123/ })).toHaveAttribute("href", "tel:116123");
    expect(screen.getByText(/volej 155 nebo 112/)).toBeInTheDocument();
  });

  it("Klid: dechový kruh se spouští klepnutím („Začneme?“)", async () => {
    const user = userEvent.setup();
    render(<App />);
    await finishOnboarding(user);

    await user.click(screen.getByRole("button", { name: "Klid" }));
    expect(screen.getByText("Na chvilku se zastav")).toBeInTheDocument();
    expect(screen.getByText("Začneme?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Začít dýchat" }));
    expect(screen.getByText("Nádech")).toBeInTheDocument();
    expect(screen.getByText("4 s nádech · 4 s výdech")).toBeInTheDocument();
  });
});
