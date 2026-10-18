/* Settings: the profile (the name, the age with "Nechci uvádět"), haptics (the saved choice holds
   after a restart), custom tags with a Delete button (the alternative to the gesture), and the
   close through Close. The appearance is not a setting: no theme switch. */
import { Alert } from "react-native";
import { fireEvent, userEvent, waitFor } from "@testing-library/react-native";
import { renderRouter, screen } from "expo-router/testing-library";
import {
  addCustomTag,
  getSetting,
  listCustomTags,
  readProfile,
  writeProfile,
} from "../src/db/repo";
import { HAPTICS_ENABLED_KEY } from "../src/features/settings/preferences";
import { haptics } from "../src/lib/haptics";
import { getTestDb } from "./helpers/testDb";

type User = ReturnType<typeof userEvent.setup>;

async function openSettings(): Promise<User> {
  const user = userEvent.setup();
  await renderRouter("app");
  await screen.findByText("Jak se dnes cítíš?");
  await user.press(screen.getByRole("button", { name: "Nastavení" }));
  expect(await screen.findByText("Profil")).toBeOnTheScreen();
  return user;
}

describe("Settings", () => {
  beforeEach(() => {
    writeProfile(getTestDb(), { onboarded: true, name: "Janko", age: "u26", share: false });
    haptics.setEnabled(true);
  });

  it("changes the name and the age; the option without an age clears the age", async () => {
    const user = await openSettings();
    expect(screen.getByRole("radio", { name: /do 26 let/ })).toBeChecked();
    await user.press(screen.getByRole("radio", { name: /27 a více/ }));
    expect(readProfile(getTestDb()).age).toBe("plus27");
    await user.press(screen.getByRole("radio", { name: /Nechci uvádět/ }));
    expect(readProfile(getTestDb()).age).toBeNull();

    await user.clear(screen.getByLabelText("Jak ti říkat"));
    await user.type(screen.getByLabelText("Jak ti říkat"), "Alex");
    expect(readProfile(getTestDb()).name).toBe("Alex");
  });

  it("saves the haptics switch off and the module stops the feedback", async () => {
    await openSettings();
    const toggle = screen.getByRole("switch", { name: "Haptická odezva" });
    expect(toggle).toBeChecked();
    await fireEvent(toggle, "valueChange", false);
    await waitFor(() => expect(haptics.isEnabled()).toBe(false));
    expect(getSetting<boolean>(getTestDb(), HAPTICS_ENABLED_KEY)).toBe(false);
  });

  it("deletes a custom tag with a confirmation and without a gesture", async () => {
    addCustomTag(getTestDb(), "terapie");
    jest.spyOn(Alert, "alert").mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.style === "destructive")?.onPress?.();
    });
    const user = await openSettings();
    expect(screen.getByText("terapie")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Smazat štítek terapie" }));
    await waitFor(() => expect(listCustomTags(getTestDb())).toHaveLength(0));
    expect(await screen.findByText(/Vlastní štítky přidáš/)).toBeOnTheScreen();
  });

  it("has no appearance switch; Close returns to Home", async () => {
    const user = await openSettings();
    expect(screen.queryByText(/Tmavý režim|Vzhled/)).toBeNull();
    await user.press(screen.getByRole("button", { name: "Zavřít" }));
    expect(await screen.findByText("Jak se dnes cítíš?")).toBeOnTheScreen();
  });
});
