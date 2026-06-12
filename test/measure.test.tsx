/* Dotazníkové flow: WHO-5 napojený na Dnes, PHQ-9 s disclaimerem
   a kritickou otázkou 9 (> 0 → empatická mezistránka místo výsledku). */
import { act, userEvent } from "@testing-library/react-native";
import { renderRouter, screen } from "expo-router/testing-library";
import { listMeasurements } from "../src/db/repo";
import { getTestDb } from "./helpers/testDb";

type User = ReturnType<typeof userEvent.setup>;

async function finishOnboarding(user: User, age: "u26" | "plus27" = "u26"): Promise<void> {
  expect(await screen.findByText("Ahoj, tady Lumi.")).toBeOnTheScreen();
  await user.type(screen.getByLabelText(/Jak ti máme říkat/), "Janko");
  await user.press(screen.getByRole("button", { name: "Pokračovat" }));
  await user.press(screen.getByRole("radio", { name: age === "u26" ? /do 26 let/ : /27 a více/ }));
  await user.press(screen.getByRole("button", { name: "Pokračovat" }));
  await user.press(screen.getByRole("button", { name: "Rozumím, jdeme na to" }));
  expect(await screen.findByText("Jak se dnes cítíš?")).toBeOnTheScreen();
}

/** Lockout proti dvojkliku v MeasureScreen čeká 250 ms — posuň fake timery. */
async function passTapLockout() {
  await act(async () => {
    jest.advanceTimersByTime(300);
  });
}

/** Odpoví na otázku číslo `n` volbou s daným textem. */
async function answerQuestion(user: User, n: number, total: number, label: string) {
  expect(await screen.findByText(`Otázka ${n} z ${total}`)).toBeOnTheScreen();
  await passTapLockout();
  await user.press(screen.getByRole("button", { name: label }));
}

describe("WHO-5", () => {
  it("z Dnes: vyplnění → výsledek → index žije z reálných dat", async () => {
    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user);

    await user.press(screen.getByRole("button", { name: "Vyplnit první dotazník" }));
    // WHO-5 nemá disclaimer — rovnou otázky
    expect(await screen.findByText("Otázka 1 z 5")).toBeOnTheScreen();
    for (let i = 1; i <= 5; i++) await answerQuestion(user, i, 5, "Většinu času"); // 5 × 4 b.

    // výsledek: 4+4+4+4+4 = 20 → 80 %
    expect(await screen.findByText("Hotovo. Díky za chvilku.")).toBeOnTheScreen();
    expect(screen.getByText("80 %")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Hotovo" }));

    // Dnes: index z reálných dat, výzva k prvnímu dotazníku zmizela
    expect(await screen.findByText(/WHO-5 za posledních 14 dní/)).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Vyplnit první dotazník" })).toBeNull();

    const saved = listMeasurements(getTestDb(), "who5");
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ type: "who5", score: 80, answers: [4, 4, 4, 4, 4] });
  });

  it("krok zpět v otázkách opraví odpověď", async () => {
    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user);

    await user.press(screen.getByRole("button", { name: "Vyplnit první dotazník" }));
    await answerQuestion(user, 1, 5, "Nikdy");
    expect(await screen.findByText("Otázka 2 z 5")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Předchozí otázka" }));
    // znovu otázka 1 — odpověď jde změnit
    for (let i = 1; i <= 5; i++) await answerQuestion(user, i, 5, "Po celou dobu");
    expect(await screen.findByText("100 %")).toBeOnTheScreen();
  });
});

describe("PHQ-9", () => {
  async function openPhq9(user: User) {
    await user.press(screen.getByRole("button", { name: "Přehledy" }));
    expect(await screen.findByText("Chceš jít víc do hloubky?")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: /Nálada do hloubky/ }));
  }

  it("disclaimer před prvním spuštěním; „Teď ne“ vrací zpět", async () => {
    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user);
    await openPhq9(user);

    expect(await screen.findByText("Než začneš")).toBeOnTheScreen();
    expect(screen.getByText(/Nenahrazuje vyšetření/)).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Teď ne" }));
    // zpátky v Přehledech, nic se neuložilo
    expect(await screen.findByText("Tvůj týden")).toBeOnTheScreen();
    expect(listMeasurements(getTestDb(), "phq9")).toHaveLength(0);
  });

  it("otázka 9 > 0 → empatická mezistránka s akcemi, pak výsledek", async () => {
    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user);
    await openPhq9(user);

    await user.press(await screen.findByRole("button", { name: "Rozumím, pokračovat" }));
    // otázky 1–8: „Vůbec ne“ (0), otázka 9: „Několik dní“ (1)
    for (let i = 1; i <= 8; i++) await answerQuestion(user, i, 9, "Vůbec ne");
    await answerQuestion(user, 9, 9, "Několik dní");

    // mezistránka místo výsledku: klidný tón, akce viditelné
    expect(await screen.findByText("Děkujeme za upřímnost.")).toBeOnTheScreen();
    expect(screen.getByText(/Nemusíš v tom zůstávat o samotě/)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Otevřít Pomoc" })).toBeOnTheScreen();
    expect(screen.getByRole("link", { name: /Zavolat Lince bezpečí · 116 111/ })).toBeOnTheScreen();
    expect(screen.queryByText("Hotovo. Díky za chvilku.")).toBeNull();

    // měření je už uložené (dotazník je dokončený)
    const saved = listMeasurements(getTestDb(), "phq9");
    expect(saved).toHaveLength(1);
    expect(saved[0].score).toBe(1);

    await user.press(screen.getByRole("button", { name: "Pokračovat k výsledku" }));
    expect(await screen.findByText("Hotovo. Díky za chvilku.")).toBeOnTheScreen();
    expect(screen.getByText("minimální příznaky")).toBeOnTheScreen();
  });

  it("mezistránka: linka pro dospělé a „Otevřít Pomoc“ vede do Pomoci", async () => {
    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user, "plus27");
    await openPhq9(user);

    await user.press(await screen.findByRole("button", { name: "Rozumím, pokračovat" }));
    for (let i = 1; i <= 8; i++) await answerQuestion(user, i, 9, "Vůbec ne");
    await answerQuestion(user, 9, 9, "Několik dní");

    expect(await screen.findByText("Děkujeme za upřímnost.")).toBeOnTheScreen();
    // 27+ → Linka první psychické pomoci (dativ, správné číslo)
    expect(
      screen.getByRole("link", { name: /Zavolat Lince první psychické pomoci · 116 123/ }),
    ).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Otevřít Pomoc" }));
    expect(await screen.findByText("Jsme tu s tebou")).toBeOnTheScreen();
  });

  it("krok zpět u otázky 9: přepsaná odpověď > 0 pořád vede na mezistránku", async () => {
    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user);
    await openPhq9(user);

    await user.press(await screen.findByRole("button", { name: "Rozumím, pokračovat" }));
    for (let i = 1; i <= 7; i++) await answerQuestion(user, i, 9, "Vůbec ne");
    await answerQuestion(user, 8, 9, "Několik dní");
    // zpět na otázku 8 a oprava odpovědi
    expect(await screen.findByText("Otázka 9 z 9")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Předchozí otázka" }));
    await answerQuestion(user, 8, 9, "Vůbec ne");
    await answerQuestion(user, 9, 9, "Několik dní");

    expect(await screen.findByText("Děkujeme za upřímnost.")).toBeOnTheScreen();
    const saved = listMeasurements(getTestDb(), "phq9");
    expect(saved).toHaveLength(1);
    expect(saved[0].score).toBe(1); // jen přepsaná ot. 9, oprava ot. 8 se nepočítá dvakrát
  });

  it("otázka 9 = 0 → rovnou výsledek (disclaimer už podruhé není)", async () => {
    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user);

    // první návštěva: odsouhlasit disclaimer, hned odejít krokem zpět
    await openPhq9(user);
    await user.press(await screen.findByRole("button", { name: "Rozumím, pokračovat" }));
    expect(await screen.findByText("Otázka 1 z 9")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Zavřít dotazník" }));

    // druhá návštěva: žádný disclaimer, vše „Vůbec ne“ → rovnou výsledek
    await user.press(await screen.findByRole("button", { name: /Nálada do hloubky/ }));
    for (let i = 1; i <= 9; i++) await answerQuestion(user, i, 9, "Vůbec ne");
    expect(await screen.findByText("Hotovo. Díky za chvilku.")).toBeOnTheScreen();
    expect(screen.queryByText("Děkujeme za upřímnost.")).toBeNull();
  });
});
