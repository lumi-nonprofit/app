/* Guardy neuložených změn (HIG: varovat před nečekanou ztrátou rozpracovaného
   obsahu): rozepsaný check-in se nezavře bez dotazu, krok 2 → krok 1 draft
   nezahazuje, po uložení odchod bez dotazu; dotazník s odpověďmi a editor
   krizového plánu stejně. Pod Android presetem je dialog Alert.alert —
   test v něm vybere „Zrušit“ nebo destruktivní „Zahodit“. */
import { Alert } from "react-native";
import { act, userEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
/* kořenový navigationRef: jen pro simulaci nativního swipe-down (POP na kořenový stack) */
import { store } from "expo-router/build/global-state/router-store";
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
  it("prázdný zápis se zavře bez dotazu", async () => {
    const alert = mockAlert("cancel");
    const user = await openCheckin();
    await user.press(screen.getByRole("button", { name: "Zrušit" }));
    expect(await screen.findByText("Jak se dnes cítíš?")).toBeOnTheScreen();
    expect(alert).not.toHaveBeenCalled();
  });

  it("rozepsaný zápis: Zrušit se zeptá a „Zrušit“ v dialogu nechá sheet otevřený", async () => {
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

  it("rozepsaný zápis: „Zahodit“ zavře sheet", async () => {
    const alert = mockAlert("confirm");
    const user = await openCheckin();
    await user.press(screen.getByRole("radio", { name: /Napětí/ }));
    await user.press(screen.getByRole("button", { name: "Zrušit" }));
    expect(alert).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Jak se dnes cítíš?")).toBeOnTheScreen();
  });

  it("zavření sheetu z kroku 2 se zeptá; Zpět na krok 1 ne", async () => {
    const alert = mockAlert("cancel");
    const user = await openCheckin();
    await user.press(screen.getByRole("radio", { name: /Napětí/ }));
    await user.press(screen.getByRole("button", { name: "Pokračovat" }));
    expect(await screen.findByText("Které slovo to vystihuje nejlíp?")).toBeOnTheScreen();

    // swipe-down sheetu = nativní stack pošle POP cílený na stack aplikace
    // (expo-router má nad ním ještě obal __root, proto routes[0].state)
    const appStack = store.navigationRef.getRootState().routes[0]?.state;
    expect(appStack?.key).toBeDefined();
    await act(async () => {
      store.navigationRef.dispatch({ type: "POP", payload: { count: 1 }, target: appStack?.key });
    });
    await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Které slovo to vystihuje nejlíp?")).toBeOnTheScreen();

    // systémové Zpět v sheetu jen vrací na krok 1 — draft zůstává, bez dotazu
    await act(async () => {
      router.back();
    });
    expect(await screen.findByText("Jak se právě teď cítíš?")).toBeOnTheScreen();
    expect(screen.getByRole("radio", { name: /Napětí/ })).toBeChecked();
    expect(alert).toHaveBeenCalledTimes(1);
  });

  it("po uložení zavře Hotovo sheet bez dotazu", async () => {
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

describe("dotazník", () => {
  it("s odpovědí se zavření zeptá; „Zrušit“ nechá otázku otevřenou", async () => {
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

describe("krizový plán", () => {
  it("změněný text + Zpět se zeptá; Uložit odchází bez dotazu", async () => {
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
