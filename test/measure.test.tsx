/* The questionnaire flows: WHO-5 connected to "Dnes", PHQ-9 with a disclaimer and the critical
   question 9 (a value > 0 shows an empathetic interstitial page instead of the result). */
import { act, userEvent } from "@testing-library/react-native";
import { renderRouter, screen } from "expo-router/testing-library";
import { listMeasurements } from "../src/db/repo";
import { getTestDb } from "./helpers/testDb";

type User = ReturnType<typeof userEvent.setup>;

async function finishOnboarding(user: User, age: "u26" | "plus27" = "u26"): Promise<void> {
  expect(await screen.findByText("Ahoj, tady Lumi.")).toBeOnTheScreen();
  await user.type(screen.getByLabelText(/Jak ti říkat/), "Janko");
  await user.press(screen.getByRole("button", { name: "Začít" }));
  await user.press(screen.getByRole("radio", { name: age === "u26" ? /do 26 let/ : /27 a více/ }));
  await user.press(screen.getByRole("button", { name: "Pokračovat" }));
  await user.press(screen.getByRole("button", { name: "Hotovo" }));
  expect(await screen.findByText("Jak se dnes cítíš?")).toBeOnTheScreen();
}

/** The double-tap lockout in `MeasureScreen` waits 250 ms: move the fake timers forward. */
async function passTapLockout() {
  await act(async () => {
    jest.advanceTimersByTime(300);
  });
}

/** Answers question `n` with the option that has the given text. */
async function answerQuestion(user: User, n: number, total: number, label: string) {
  expect(await screen.findByText(`Otázka ${n} z ${total}`)).toBeOnTheScreen();
  await passTapLockout();
  await user.press(screen.getByRole("button", { name: label }));
}

describe("WHO-5", () => {
  it("fills in the questionnaire from Dnes, shows the result and feeds the index from real data", async () => {
    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user);

    await user.press(screen.getByRole("button", { name: "Vyplnit první dotazník" }));
    // WHO-5 has no disclaimer: the questions come at once.
    expect(await screen.findByText("Otázka 1 z 5")).toBeOnTheScreen();
    for (let i = 1; i <= 5; i++) await answerQuestion(user, i, 5, "Většinu času"); // 5 × 4 points

    // Result: 4+4+4+4+4 = 20, that is 80 %.
    expect(await screen.findByText("Hotovo. Díky za chvilku.")).toBeOnTheScreen();
    expect(screen.getByText("80 %")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Hotovo" }));

    // "Dnes": the index comes from real data, and the first-questionnaire prompt disappears.
    expect(await screen.findByText(/WHO-5 za posledních 14 dní/)).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Vyplnit první dotazník" })).toBeNull();

    const saved = listMeasurements(getTestDb(), "who5");
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ type: "who5", score: 80, answers: [4, 4, 4, 4, 4] });
  });

  it("goes one question back and corrects the answer", async () => {
    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user);

    await user.press(screen.getByRole("button", { name: "Vyplnit první dotazník" }));
    await answerQuestion(user, 1, 5, "Nikdy");
    expect(await screen.findByText("Otázka 2 z 5")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Předchozí otázka" }));
    // Question 1 again: the user can change the answer.
    for (let i = 1; i <= 5; i++) await answerQuestion(user, i, 5, "Po celou dobu");
    expect(await screen.findByText("100 %")).toBeOnTheScreen();
  });
});

describe("PHQ-9", () => {
  async function openPhq9(user: User) {
    await user.press(screen.getByRole("tab", { name: "Přehledy" }));
    expect(await screen.findByText("Chceš jít víc do hloubky?")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: /Nálada do hloubky/ }));
  }

  it("shows the disclaimer before the first run, and the decline button goes back", async () => {
    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user);
    await openPhq9(user);

    expect(await screen.findByText("Než začneš")).toBeOnTheScreen();
    expect(screen.getByText(/Nenahrazuje vyšetření/)).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Teď ne" }));
    // Back on "Přehledy": the DB has no measurement.
    expect(await screen.findByText("Tvůj týden")).toBeOnTheScreen();
    expect(listMeasurements(getTestDb(), "phq9")).toHaveLength(0);
  });

  it("shows the empathetic interstitial page with actions after question 9 > 0, then the result", async () => {
    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user);
    await openPhq9(user);

    await user.press(await screen.findByRole("button", { name: "Pokračovat" }));
    // Questions 1 to 8: "Vůbec ne" (0), question 9: "Několik dní" (1).
    for (let i = 1; i <= 8; i++) await answerQuestion(user, i, 9, "Vůbec ne");
    await answerQuestion(user, 9, 9, "Několik dní");

    // The interstitial page replaces the result: calm tone, visible actions.
    expect(await screen.findByText("Díky za upřímnost.")).toBeOnTheScreen();
    expect(screen.getByText(/Nemusíš v tom zůstávat o samotě/)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Otevřít Pomoc" })).toBeOnTheScreen();
    expect(screen.getByRole("link", { name: /Zavolat Lince bezpečí · 116 111/ })).toBeOnTheScreen();
    expect(screen.queryByText("Hotovo. Díky za chvilku.")).toBeNull();

    // The measurement is already in the DB (the questionnaire is complete).
    const saved = listMeasurements(getTestDb(), "phq9");
    expect(saved).toHaveLength(1);
    expect(saved[0].score).toBe(1);

    await user.press(screen.getByRole("button", { name: "Pokračovat k výsledku" }));
    expect(await screen.findByText("Hotovo. Díky za chvilku.")).toBeOnTheScreen();
    expect(screen.getByText("minimální příznaky")).toBeOnTheScreen();
  });

  it("shows the adult line on the interstitial page, and the help button opens Pomoc", async () => {
    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user, "plus27");
    await openPhq9(user);

    await user.press(await screen.findByRole("button", { name: "Pokračovat" }));
    for (let i = 1; i <= 8; i++) await answerQuestion(user, i, 9, "Vůbec ne");
    await answerQuestion(user, 9, 9, "Několik dní");

    expect(await screen.findByText("Díky za upřímnost.")).toBeOnTheScreen();
    // Age 27+: "Linka první psychické pomoci" (dative case, correct number).
    expect(
      screen.getByRole("link", { name: /Zavolat Lince první psychické pomoci · 116 123/ }),
    ).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Otevřít Pomoc" }));
    expect(await screen.findByText("Pomoc je blízko")).toBeOnTheScreen();
  });

  it("goes back from question 9, corrects question 8, and an answer > 0 still opens the interstitial page", async () => {
    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user);
    await openPhq9(user);

    await user.press(await screen.findByRole("button", { name: "Pokračovat" }));
    for (let i = 1; i <= 7; i++) await answerQuestion(user, i, 9, "Vůbec ne");
    await answerQuestion(user, 8, 9, "Několik dní");
    // Back to question 8 to correct the answer.
    expect(await screen.findByText("Otázka 9 z 9")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Předchozí otázka" }));
    await answerQuestion(user, 8, 9, "Vůbec ne");
    await answerQuestion(user, 9, 9, "Několik dní");

    expect(await screen.findByText("Díky za upřímnost.")).toBeOnTheScreen();
    const saved = listMeasurements(getTestDb(), "phq9");
    expect(saved).toHaveLength(1);
    // Only question 9 counts; the correction of question 8 does not count twice.
    expect(saved[0].score).toBe(1);
  });

  it("shows the result at once when question 9 = 0, and the disclaimer does not come a second time", async () => {
    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user);

    // First visit: accept the disclaimer, then leave at once.
    await openPhq9(user);
    await user.press(await screen.findByRole("button", { name: "Pokračovat" }));
    expect(await screen.findByText("Otázka 1 z 9")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Zavřít dotazník" }));

    // Second visit: no disclaimer, all "Vůbec ne", the result comes at once.
    await user.press(await screen.findByRole("button", { name: /Nálada do hloubky/ }));
    for (let i = 1; i <= 9; i++) await answerQuestion(user, i, 9, "Vůbec ne");
    expect(await screen.findByText("Hotovo. Díky za chvilku.")).toBeOnTheScreen();
    expect(screen.queryByText("Díky za upřímnost.")).toBeNull();
  });
});
