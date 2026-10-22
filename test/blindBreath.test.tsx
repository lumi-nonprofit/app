/* "Dech naslepo", a complete run. The test selects the rhythm and the length and waits for
   the countdown. Vibration cues guide the full-screen surface (the inhale vibrates). Then
   the length runs out.
   The test seeds the profile into the DB and goes to "Klid" through the tabs. The onboarding
   flow would only cost time with the fake timers (`renderRouter` turns them on). The
   separate file `blindBreathCancel.test.tsx` covers the early exit with a double tap: 2 runs
   in 1 render contaminate each other when the fake timers move. */
import { act, userEvent } from "@testing-library/react-native";
import { renderRouter, screen } from "expo-router/testing-library";
import { haptics } from "../src/lib/haptics";
import { writeProfile } from "../src/db/repo";
import { getTestDb } from "./helpers/testDb";

type User = ReturnType<typeof userEvent.setup>;

async function openBlindSetup(): Promise<User> {
  const user = userEvent.setup();
  writeProfile(getTestDb(), { onboarded: true, name: "Janko", age: "u26", share: false });
  await renderRouter("app");
  await user.press(await screen.findByRole("tab", { name: "Klid" }));
  await user.press(await screen.findByText("Dech naslepo"));
  // The setup is visible, the countdown is not yet.
  expect(await screen.findByText(/Telefon můžeš nechat v kapse/)).toBeOnTheScreen();
  expect(screen.queryByText("Schovej telefon do kapsy")).toBeNull();
  await user.press(screen.getByRole("radio", { name: /4-7-8/ }));
  await user.press(screen.getByRole("radio", { name: "1 min" }));
  return user;
}

it("goes from the setup through the countdown to the run, vibrates on the inhale and confirms the end of the length", async () => {
  const user = await openBlindSetup();

  await user.press(screen.getByRole("button", { name: "Začít" }));
  expect(await screen.findByText("Schovej telefon do kapsy")).toBeOnTheScreen();

  // The countdown 3, 2, 1, then the active surface.
  await act(async () => {
    jest.advanceTimersByTime(3000);
  });
  expect(await screen.findByText("Klepni dvakrát pro konec")).toBeOnTheScreen();

  // The first second (second 0) is the inhale: a strong pulse.
  const strongPulse = jest.spyOn(haptics, "strongPulse");
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
  expect(strongPulse).toHaveBeenCalled();

  // 1 min = 60 seconds: after the end, the haptics confirm the completion.
  const success = jest.spyOn(haptics, "success");
  await act(async () => {
    jest.advanceTimersByTime(60_000);
  });
  expect(await screen.findByText("Hotovo. Díky za chvilku.")).toBeOnTheScreen();
  expect(success).toHaveBeenCalled();
});
