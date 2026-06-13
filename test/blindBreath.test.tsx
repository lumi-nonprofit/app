/* Dech naslepo — dokončení celého běhu: výběr rytmu/délky, odpočet,
   celoplošná plocha vedená vibracemi (nádech zavibruje), doběhnutí délky.
   Profil seedujeme do DB a do Klidu jdeme přes taby — onboarding flow se
   s fake timery (renderRouter je zapíná) nezdržuje. Předčasné ukončení
   poklepáním pokrývá samostatný soubor blindBreathCancel.test.tsx (dva
   běhy v jednom renderu se s posunem fake timerů znečišťují). */
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
  await user.press(await screen.findByRole("button", { name: "Klid" }));
  await user.press(await screen.findByText("Dech naslepo"));
  // setup je vidět, odpočet zatím ne
  expect(await screen.findByText(/Telefon můžeš nechat v kapse/)).toBeOnTheScreen();
  expect(screen.queryByText("Schovej telefon do kapsy")).toBeNull();
  await user.press(screen.getByRole("radio", { name: /4-7-8/ }));
  await user.press(screen.getByRole("radio", { name: "1 min" }));
  return user;
}

it("setup → odpočet → běh; nádech zavibruje a uplynutí celé délky potvrdí dokončení", async () => {
  const user = await openBlindSetup();

  await user.press(screen.getByRole("button", { name: "Začít" }));
  expect(await screen.findByText("Schovej telefon do kapsy")).toBeOnTheScreen();

  // odpočet 3·2·1 → běžící plocha
  await act(async () => {
    jest.advanceTimersByTime(3000);
  });
  expect(await screen.findByText("Klepni dvakrát pro konec")).toBeOnTheScreen();

  // první vteřina (second 0) je nádech → výrazný impulz
  const strongPulse = jest.spyOn(haptics, "strongPulse");
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
  expect(strongPulse).toHaveBeenCalled();

  // 1 min = 60 vteřin → po doběhnutí potvrzení dokončeno haptikou
  const success = jest.spyOn(haptics, "success");
  await act(async () => {
    jest.advanceTimersByTime(60_000);
  });
  expect(await screen.findByText("Hotovo. Díky za chvilku.")).toBeOnTheScreen();
  expect(success).toHaveBeenCalled();
});
