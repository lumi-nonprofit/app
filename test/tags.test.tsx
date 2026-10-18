/* Custom tags in the check-in (step 2): the user adds one with "+ přidat" (the chip always
   comes after the built-in ones), the entry stores it, and a long press deletes it. The
   entries that already use the tag stay unchanged. */
import { Alert } from "react-native";
import { fireEvent, userEvent, waitFor, within } from "@testing-library/react-native";
import { renderRouter, screen } from "expo-router/testing-library";
import { listCustomTags, listEntries } from "../src/db/repo";
import { CONTEXT_TAGS } from "../src/model";
import { getTestDb } from "./helpers/testDb";

type User = ReturnType<typeof userEvent.setup>;

async function finishOnboarding(user: User): Promise<void> {
  // The hydration is asynchronous: the first screen appears only after the load.
  expect(await screen.findByText("Ahoj, tady Lumi.")).toBeOnTheScreen();
  await user.type(screen.getByLabelText(/Jak ti říkat/), "Janko");
  await user.press(screen.getByRole("button", { name: "Začít" }));
  await user.press(screen.getByRole("radio", { name: /do 26 let/ }));
  await user.press(screen.getByRole("button", { name: "Pokračovat" }));
  await user.press(screen.getByRole("button", { name: "Hotovo" }));
  expect(await screen.findByText("Jak se dnes cítíš?")).toBeOnTheScreen();
}

/** Opens the check-in from "Dnes", selects a state and goes to step 2 (words and tags). */
async function openStep2(user: User, cta = "Začít check-in"): Promise<void> {
  await user.press(screen.getByRole("button", { name: cta }));
  expect(await screen.findByText("Jak se právě teď cítíš?")).toBeOnTheScreen();
  await user.press(screen.getByRole("radio", { name: /Napětí/ }));
  await user.press(screen.getByRole("button", { name: "Pokračovat" }));
  expect(await screen.findByText("Které slovo to vystihuje nejlíp?")).toBeOnTheScreen();
}

/** The texts of all buttons in render order, to check the order of the chips. */
function buttonNames(): string[] {
  return screen.getAllByRole("button").map((b) =>
    within(b)
      .queryAllByText(/.+/)
      .map((t) => String(t.props.children))
      .join(""),
  );
}

describe("Custom tags", () => {
  it("adds a custom tag, selects it, sorts it after the built-in ones and stores it in the DB", async () => {
    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user);
    await openStep2(user);

    await user.press(screen.getByRole("button", { name: "+ přidat" }));
    // An empty input does nothing: the field stays open, the DB stays unchanged.
    await user.press(screen.getByRole("button", { name: "Přidat" }));
    expect(screen.getByLabelText("Nový štítek")).toBeOnTheScreen();
    expect(listCustomTags(getTestDb())).toHaveLength(0);

    await user.type(screen.getByLabelText("Nový štítek"), "terapie");
    await user.press(screen.getByRole("button", { name: "Přidat" }));

    // The new chip starts selected, and the input closes.
    expect(await screen.findByRole("button", { name: "terapie" })).toBeSelected();
    expect(screen.queryByLabelText("Nový štítek")).toBeNull();

    // Order: after the last built-in tag, before "+ přidat".
    const names = buttonNames();
    const lastBuiltin = CONTEXT_TAGS[CONTEXT_TAGS.length - 1];
    expect(names.indexOf("terapie")).toBeGreaterThan(names.indexOf(lastBuiltin));
    expect(names.indexOf("terapie")).toBeLessThan(names.indexOf("+ přidat"));

    // The DB stores the tag as a custom one (not built-in).
    const custom = listCustomTags(getTestDb());
    expect(custom).toHaveLength(1);
    expect(custom[0]).toMatchObject({ label: "terapie", builtin: false });
  });

  it("stores the custom tag in the entry and only selects a duplicate label", async () => {
    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user);
    await openStep2(user);

    await user.press(screen.getByRole("button", { name: "stres" }));
    await user.press(screen.getByRole("button", { name: "+ přidat" }));
    // The keyboard also confirms (`returnKeyType` done fires `onSubmitEditing`).
    await user.type(screen.getByLabelText("Nový štítek"), "terapie", { submitEditing: true });
    expect(await screen.findByRole("button", { name: "terapie" })).toBeSelected();

    // A duplicate label: no second chip and no second row in the DB.
    await user.press(screen.getByRole("button", { name: "+ přidat" }));
    await user.type(screen.getByLabelText("Nový štítek"), "terapie", { submitEditing: true });
    expect(screen.getAllByRole("button", { name: "terapie" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "terapie" })).toBeSelected();
    expect(listCustomTags(getTestDb())).toHaveLength(1);

    await user.press(screen.getByRole("button", { name: "Uložit zápis" }));
    expect(await screen.findByText("Uloženo.")).toBeOnTheScreen();

    const rows = listEntries(getTestDb());
    expect(rows).toHaveLength(1);
    expect(rows[0].tags).toEqual(["terapie"]);
  });

  it("long press on a custom chip asks first, then removes the tag and keeps the older entries", async () => {
    const user = userEvent.setup();
    // The test confirms the alert at once with the destructive button ("Smazat").
    jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => {
      buttons?.find((b) => b.style === "destructive")?.onPress?.();
    });
    await renderRouter("app");
    await finishOnboarding(user);

    // The first entry with the custom tag: it must stay unchanged after the removal of the tag.
    await openStep2(user);
    await user.press(screen.getByRole("button", { name: "stres" }));
    await user.press(screen.getByRole("button", { name: "+ přidat" }));
    await user.type(screen.getByLabelText("Nový štítek"), "terapie", { submitEditing: true });
    await user.press(screen.getByRole("button", { name: "Uložit zápis" }));
    expect(await screen.findByText("Uloženo.")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Zpět na Dnes" }));
    expect(await screen.findByText(/Dnes zapsáno/)).toBeOnTheScreen();

    // Second check-in: select a built-in tag and the custom tag, then delete the custom tag
    // with a long press.
    await openStep2(user, "Přidat další zápis");
    await user.press(screen.getByRole("button", { name: "obavy" }));
    await user.press(screen.getByRole("button", { name: "škola" }));
    await user.press(screen.getByRole("button", { name: "terapie" }));
    fireEvent(screen.getByRole("button", { name: "terapie" }), "longPress");

    expect(Alert.alert).toHaveBeenCalledWith(
      "Smazat štítek?",
      "Záznamy, kde už je použitý, zůstanou beze změny.",
      expect.any(Array),
      expect.objectContaining({ cancelable: true }),
    );

    // The chip disappears from the list and from the DB; the rest of the draft selection stays.
    // (The alert confirmation runs outside `userEvent`, so wait for the re-render to finish.)
    await waitFor(() => expect(screen.queryByRole("button", { name: "terapie" })).toBeNull());
    expect(listCustomTags(getTestDb())).toHaveLength(0);
    expect(screen.getByRole("button", { name: "škola" })).toBeSelected();
    expect(screen.getByRole("button", { name: "obavy" })).toBeSelected();

    // The app stores the new entry without the deleted tag; the older entry still has it.
    await user.press(screen.getByRole("button", { name: "Uložit zápis" }));
    expect(await screen.findByText("Uloženo.")).toBeOnTheScreen();
    const rows = listEntries(getTestDb());
    expect(rows).toHaveLength(2);
    const tagsByWords = Object.fromEntries(rows.map((r) => [r.words.join(","), r.tags]));
    expect(tagsByWords["stress"]).toEqual(["terapie"]); // older entry unchanged
    expect(tagsByWords["worry"]).toEqual(["school"]); // new entry without the deleted tag
  });
});
