/* The main flows through expo-router (the real routes from the `app/` folder):
   onboarding, "Dnes", check-in, confirmation, "Přehledy", "Pomoc".
   The data lives in SQLite (better-sqlite3 in the tests, see `helpers/testDb`).
   The router owns the navigation and does not persist it anywhere. */
import { Linking } from "react-native";
import { act, fireEvent, userEvent } from "@testing-library/react-native";
import { router } from "expo-router";
import { renderRouter, screen } from "expo-router/testing-library";
import { listEntries, readProfile } from "../src/db/repo";
import { getTestDb } from "./helpers/testDb";

type User = ReturnType<typeof userEvent.setup>;

async function finishOnboarding(user: User, name = "Janko"): Promise<void> {
  // The database hydration is asynchronous: the first screen appears only after the load.
  expect(await screen.findByText("Ahoj, tady Lumi.")).toBeOnTheScreen();
  // The name is optional: "Začít" is active at once.
  expect(screen.getByRole("button", { name: "Začít" })).not.toBeDisabled();
  await user.type(screen.getByLabelText(/Jak ti říkat/), name);
  await user.press(screen.getByRole("button", { name: "Začít" }));

  // The age selects the primary crisis line.
  expect(await screen.findByText("Kolik ti je?")).toBeOnTheScreen();
  await user.press(screen.getByRole("radio", { name: /do 26 let/ }));
  await user.press(screen.getByRole("button", { name: "Pokračovat" }));

  // Privacy: the last step ends with "Hotovo" (HIG: "Začít", "Pokračovat", "Hotovo").
  expect(await screen.findByText("Tvoje data zůstávají u tebe")).toBeOnTheScreen();
  await user.press(screen.getByRole("button", { name: "Hotovo" }));
  // The protected stack redirects to the tabs by itself.
  expect(await screen.findByText("Jak se dnes cítíš?")).toBeOnTheScreen();
}

describe("Lumi app", () => {
  it("completes the onboarding to the Dnes tab and stores the profile in the DB", async () => {
    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user);

    expect(screen.getByRole("header", { name: /Janko/ })).toBeOnTheScreen();
    // First day: a prompt for the first questionnaire replaces the percentage.
    expect(screen.getByRole("button", { name: "Vyplnit první dotazník" })).toBeOnTheScreen();

    const profile = readProfile(getTestDb());
    expect(profile.onboarded).toBe(true);
    expect(profile.name).toBe("Janko");
    expect(profile.age).toBe("u26");
  });

  it("saves the check-in and shows the confirmation with a context tip", async () => {
    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user);

    await user.press(screen.getByRole("button", { name: "Začít check-in" }));
    expect(await screen.findByText("Jak se právě teď cítíš?")).toBeOnTheScreen();

    // "Pokračovat" is disabled until the user selects a state.
    expect(screen.getByRole("button", { name: "Pokračovat" })).toBeDisabled();
    await user.press(screen.getByRole("radio", { name: /Napětí/ }));
    await user.press(screen.getByRole("button", { name: "Pokračovat" }));

    // Step 2: words (2 at most), tags, note.
    expect(await screen.findByText("Které slovo to vystihuje nejlíp?")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Uložit zápis" })).toBeDisabled();
    await user.press(screen.getByRole("button", { name: "stres" }));
    await user.press(screen.getByRole("button", { name: "obavy" }));
    await user.press(screen.getByRole("button", { name: "neklid" })); // the third stays unselected
    expect(screen.getByRole("button", { name: "neklid" })).not.toBeSelected();
    await user.press(screen.getByRole("button", { name: "škola" }));
    await user.press(screen.getByRole("button", { name: "Uložit zápis" }));

    // Confirmation: gender-neutral text, the tip for "Napětí" is "Dech 4-7-8".
    expect(await screen.findByText("Uloženo.")).toBeOnTheScreen();
    expect(screen.getByText(/Tohle byla chvilka pro tebe/)).toBeOnTheScreen();
    expect(screen.getByText("Dech 4-7-8")).toBeOnTheScreen();

    // Back on "Dnes": the card summarizes the entry of today.
    await user.press(screen.getByRole("button", { name: "Zpět na Dnes" }));
    expect(await screen.findByText(/Dnes zapsáno: Napětí · stres, obavy/)).toBeOnTheScreen();

    const rows = listEntries(getTestDb());
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      mood: "napeti",
      intensity: 3,
      words: ["stress", "worry"],
      tags: ["school"],
    });
  });

  it("goes back from step 2 to step 1 with router.back and keeps the draft", async () => {
    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user);

    await user.press(screen.getByRole("button", { name: "Začít check-in" }));
    expect(await screen.findByText("Jak se právě teď cítíš?")).toBeOnTheScreen();
    await user.press(screen.getByRole("radio", { name: /Klid/ }));
    await user.press(screen.getByRole("button", { name: "Pokračovat" }));
    expect(await screen.findByText("Které slovo to vystihuje nejlíp?")).toBeOnTheScreen();

    // Back to step 1: the selected state stays (the draft lives in the provider of the stack).
    // "Zpět" is the system button of the native header. In Jest the test goes back through
    // the router.
    await act(async () => {
      router.back();
    });
    expect(await screen.findByText("Jak se právě teď cítíš?")).toBeOnTheScreen();
    expect(screen.getByRole("radio", { name: /Klid/ })).toBeChecked();
  });

  it("shows an empty week without guilt on Přehledy, and the share switch in Nastavení is off by default", async () => {
    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user);

    await user.press(screen.getByRole("tab", { name: "Přehledy" }));
    expect(await screen.findByText("Tvůj týden")).toBeOnTheScreen();
    expect(screen.getByText(/Zatím tu toho moc není — každý zápis se počítá/)).toBeOnTheScreen();
    expect(screen.queryByRole("switch")).toBeNull();

    // The gear in the header opens "Nastavení" (a modal). The label of the switch describes
    // the state "zapnuto".
    await user.press(screen.getByRole("button", { name: "Nastavení" }));
    const share = await screen.findByRole("switch", { name: "Sdílet data pro výzkum" });
    expect(share).not.toBeChecked();
    await fireEvent(share, "valueChange", true);
    expect(screen.getByRole("switch", { name: "Sdílet data pro výzkum" })).toBeChecked();
    expect(readProfile(getTestDb()).share).toBe(true);
  });

  it("shows on Pomoc the primary line by age, the tel: links and the 155/112 row", async () => {
    const user = userEvent.setup();
    // Same as `mockResolvedValue()` at runtime, but `@types/jest` requires the argument here.
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    await renderRouter("app");
    await finishOnboarding(user); // age under 26

    await user.press(screen.getByRole("tab", { name: "Pomoc" }));
    expect(await screen.findByText("Pomoc je blízko")).toBeOnTheScreen();
    expect(screen.getByText("tvoje linka")).toBeOnTheScreen();

    // RN opens `tel:` links through `Linking.openURL`.
    const call116111 = screen.getAllByRole("link", { name: /Zavolat 116 111/ })[0];
    await user.press(call116111);
    expect(openURL).toHaveBeenCalledWith("tel:116111");
    await user.press(screen.getByRole("link", { name: /Zavolat 116 123/ }));
    expect(openURL).toHaveBeenCalledWith("tel:116123");
    // The emergency numbers are rows the user can call, not only text.
    await user.press(screen.getByRole("link", { name: /Zavolat 155/ }));
    expect(openURL).toHaveBeenCalledWith("tel:155");
    await user.press(screen.getByRole("link", { name: /Zavolat 112/ }));
    expect(openURL).toHaveBeenCalledWith("tel:112");
  });

  it("starts the breath circle on Klid with a tap", async () => {
    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user);

    await user.press(screen.getByRole("tab", { name: "Klid" }));
    expect(await screen.findByText("Na chvilku se zastav")).toBeOnTheScreen();
    expect(screen.getByText("Začneme?")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Začít dýchat" }));
    expect(screen.getByText("Nádech")).toBeOnTheScreen();
    expect(screen.getByText("4 s nádech · 4 s výdech")).toBeOnTheScreen();
  });
});
