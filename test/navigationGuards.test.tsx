/* The guards for unsaved changes (HIG: warn before an unexpected loss of content in
   progress). A check-in in progress does not close without a question. The step from step 2
   back to step 1 keeps the draft. The exit after the save asks nothing. A questionnaire with
   answers and the crisis plan editor behave the same. Under the Android preset the dialog
   is `Alert.alert`; the test selects "Zrušit" or the destructive "Zahodit" in it. */
import { Alert } from "react-native";
import { act, userEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
/* The root `navigationRef`: only to simulate the native swipe-down (a POP on the root stack). */
import { navigationRef } from "expo-router/build/global-state/navigationRef";
import { renderRouter, screen } from "expo-router/testing-library";
import { writeProfile } from "../src/db/repo";
import { getTestDb } from "./helpers/testDb";

type User = ReturnType<typeof userEvent.setup>;

function mockAlert(choice: "confirm" | "cancel") {
  return jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => {
    const button = buttons?.find((b) =>
      choice === "confirm" ? b.style === "destructive" : b.style === "cancel",
    );
    button?.onPress?.();
  });
}

async function openCheckin(): Promise<User> {
  const user = userEvent.setup();
  writeProfile(getTestDb(), { onboarded: true, name: "Janko", age: "u26", share: false });
  await renderRouter("app");
  await user.press(await screen.findByRole("button", { name: "Začít check-in" }));
  expect(await screen.findByText("Jak se právě teď cítíš?")).toBeOnTheScreen();
  return user;
}

describe("check-in sheet", () => {
  it("closes an empty entry without a question", async () => {
    const alert = mockAlert("cancel");
    const user = await openCheckin();
    await user.press(screen.getByRole("button", { name: "Zrušit" }));
    expect(await screen.findByText("Jak se dnes cítíš?")).toBeOnTheScreen();
    expect(alert).not.toHaveBeenCalled();
  });

  it("asks on cancel of an entry in progress, and the dialog cancel keeps the sheet open", async () => {
    const alert = mockAlert("cancel");
    const user = await openCheckin();
    await user.press(screen.getByRole("radio", { name: /Napětí/ }));
    await user.press(screen.getByRole("button", { name: "Zrušit" }));
    expect(alert).toHaveBeenCalledWith(
      "Zahodit rozepsaný zápis?",
      expect.stringContaining("neuloží"),
      expect.any(Array),
      expect.anything(),
    );
    expect(screen.getByText("Jak se právě teď cítíš?")).toBeOnTheScreen();
    expect(screen.getByRole("radio", { name: /Napětí/ })).toBeChecked();
  });

  it("closes the sheet when the user discards an entry in progress", async () => {
    const alert = mockAlert("confirm");
    const user = await openCheckin();
    await user.press(screen.getByRole("radio", { name: /Napětí/ }));
    await user.press(screen.getByRole("button", { name: "Zrušit" }));
    expect(alert).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Jak se dnes cítíš?")).toBeOnTheScreen();
  });

  it("asks on close of the sheet from step 2, but not on the step back to step 1", async () => {
    const alert = mockAlert("cancel");
    const user = await openCheckin();
    await user.press(screen.getByRole("radio", { name: /Napětí/ }));
    await user.press(screen.getByRole("button", { name: "Pokračovat" }));
    expect(await screen.findByText("Které slovo to vystihuje nejlíp?")).toBeOnTheScreen();

    // A swipe-down of the sheet: the native stack sends a POP that targets the app stack
    // (expo-router wraps it in `__root`, thus `routes[0].state`).
    const appStack = navigationRef.getRootState().routes[0]?.state;
    expect(appStack?.key).toBeDefined();
    await act(async () => {
      navigationRef.dispatch({ type: "POP", payload: { count: 1 }, target: appStack?.key });
    });
    await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Které slovo to vystihuje nejlíp?")).toBeOnTheScreen();

    // The system back in the sheet only returns to step 1: the draft stays, no question.
    await act(async () => {
      router.back();
    });
    expect(await screen.findByText("Jak se právě teď cítíš?")).toBeOnTheScreen();
    expect(screen.getByRole("radio", { name: /Napětí/ })).toBeChecked();
    expect(alert).toHaveBeenCalledTimes(1);
  });

  it("closes the sheet with the done button after the save, without a question", async () => {
    const alert = mockAlert("cancel");
    const user = await openCheckin();
    await user.press(screen.getByRole("radio", { name: /Klid/ }));
    await user.press(screen.getByRole("button", { name: "Pokračovat" }));
    await user.press(await screen.findByRole("button", { name: "pohoda" }));
    await user.press(screen.getByRole("button", { name: "Uložit zápis" }));
    expect(await screen.findByText("Uloženo.")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Hotovo" }));
    expect(await screen.findByText(/Dnes zapsáno: Klid/)).toBeOnTheScreen();
    expect(alert).not.toHaveBeenCalled();
  });
});

describe("questionnaire", () => {
  it("asks on close when an answer exists, and the cancel button keeps the question open", async () => {
    const alert = mockAlert("cancel");
    const user = userEvent.setup();
    writeProfile(getTestDb(), { onboarded: true, name: "Janko", age: "u26", share: false });
    await renderRouter("app");
    await user.press(await screen.findByRole("button", { name: "Vyplnit první dotazník" }));
    expect(await screen.findByText("Otázka 1 z 5")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Po celou dobu" }));
    expect(await screen.findByText("Otázka 2 z 5")).toBeOnTheScreen();

    await act(async () => {
      router.dismiss();
    });
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith(
        "Ukončit dotazník?",
        expect.any(String),
        expect.any(Array),
        expect.anything(),
      ),
    );
    expect(screen.getByText("Otázka 2 z 5")).toBeOnTheScreen();
  });
});

describe("crisis plan", () => {
  it("asks on back after a text change, and the save button leaves without a question", async () => {
    const alert = mockAlert("cancel");
    const user = userEvent.setup();
    writeProfile(getTestDb(), { onboarded: true, name: "Janko", age: "u26", share: false });
    await renderRouter("app", { initialUrl: "/help" });
    await user.press(await screen.findByRole("button", { name: /Moje varovné signály/ }));
    await user.type(await screen.findByLabelText(/Moje varovné signály/), "nespavost");

    await act(async () => {
      router.back();
    });
    await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
    expect(alert).toHaveBeenLastCalledWith(
      "Zahodit změny v plánu?",
      expect.any(String),
      expect.any(Array),
      expect.anything(),
    );
    expect(screen.getByLabelText(/Moje varovné signály/)).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Uložit" }));
    expect(
      await screen.findByText(/Podle čeho poznám, že se to horší · vyplněno/),
    ).toBeOnTheScreen();
    expect(alert).toHaveBeenCalledTimes(1);
  });
});
