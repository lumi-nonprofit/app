/* Dech naslepo — předčasné ukončení poklepáním. Samostatný soubor (jeden
   render): dvojí dotek do 350 ms vrátí na setup a NEspustí haptiku
   dokončení. Dokončení celého běhu řeší blindBreath.test.tsx. */
import { act, fireEvent, userEvent } from "@testing-library/react-native";
import { renderRouter, screen } from "expo-router/testing-library";
import { haptics } from "../src/lib/haptics";
import { writeProfile } from "../src/db/repo";
import { getTestDb } from "./helpers/testDb";

it("poklepání na plochu ukončí cvičení předčasně, bez haptiky dokončení", async () => {
  const user = userEvent.setup();
  writeProfile(getTestDb(), { onboarded: true, name: "Janko", age: "u26", share: false });
  await renderRouter("app");
  await user.press(await screen.findByRole("button", { name: "Klid" }));
  await user.press(await screen.findByText("Dech naslepo"));
  await user.press(await screen.findByRole("radio", { name: /4-4/ }));

  await user.press(screen.getByRole("button", { name: "Začít" }));
  // odpočet → běžící plocha
  await act(async () => {
    jest.advanceTimersByTime(3000);
  });
  expect(await screen.findByText("Klepni dvakrát pro konec")).toBeOnTheScreen();
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });

  // dvojí poklepání do 350 ms → zpět na setup, bez haptiky dokončení
  const success = jest.spyOn(haptics, "success");
  const surface = screen.getByRole("button", { name: "Probíhá dech naslepo" });
  fireEvent.press(surface, { nativeEvent: { timestamp: 1000 } });
  fireEvent.press(surface, { nativeEvent: { timestamp: 1100 } });

  expect(await screen.findByText(/Telefon můžeš nechat v kapse/)).toBeOnTheScreen();
  expect(success).not.toHaveBeenCalled();
});
