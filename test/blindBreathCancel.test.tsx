/* "Dech naslepo", the early exit with a double tap. A separate file (1 render): a double
   touch within 350 ms returns to the setup and does NOT start the completion haptics.
   The file `blindBreath.test.tsx` covers the complete run. */
import { act, fireEvent, userEvent } from "@testing-library/react-native";
import { renderRouter, screen } from "expo-router/testing-library";
import { haptics } from "../src/lib/haptics";
import { writeProfile } from "../src/db/repo";
import { getTestDb } from "./helpers/testDb";

it("ends the exercise early on a double tap of the surface, without the completion haptics", async () => {
  const user = userEvent.setup();
  writeProfile(getTestDb(), { onboarded: true, name: "Janko", age: "u26", share: false });
  await renderRouter("app");
  await user.press(await screen.findByRole("tab", { name: "Klid" }));
  await user.press(await screen.findByText("Dech naslepo"));
  await user.press(await screen.findByRole("radio", { name: /4-4/ }));

  await user.press(screen.getByRole("button", { name: "Začít" }));
  // The countdown, then the active surface.
  await act(async () => {
    jest.advanceTimersByTime(3000);
  });
  expect(await screen.findByText("Klepni dvakrát pro konec")).toBeOnTheScreen();
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });

  // A double tap within 350 ms: back to the setup, without the completion haptics.
  const success = jest.spyOn(haptics, "success");
  const surface = screen.getByRole("button", { name: "Probíhá dech naslepo" });
  fireEvent.press(surface, { nativeEvent: { timestamp: 1000 } });
  fireEvent.press(surface, { nativeEvent: { timestamp: 1100 } });

  expect(await screen.findByText(/Telefon můžeš nechat v kapse/)).toBeOnTheScreen();
  expect(success).not.toHaveBeenCalled();
});
