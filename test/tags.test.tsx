/* Vlastní štítky v check-inu (krok 2): přidání přes „+ přidat“ (chip se řadí
   vždy za vestavěné), uložení do záznamu a mazání podržením — záznamy,
   kde už je štítek použitý, zůstávají beze změny. */
import { Alert } from "react-native";
import { fireEvent, userEvent, waitFor, within } from "@testing-library/react-native";
import { renderRouter, screen } from "expo-router/testing-library";
import { listCustomTags, listEntries } from "../src/db/repo";
import { CONTEXT_TAGS } from "../src/model";
import { getTestDb } from "./helpers/testDb";

type User = ReturnType<typeof userEvent.setup>;

async function finishOnboarding(user: User): Promise<void> {
  // hydratace je asynchronní — první obrazovka se objeví až po načtení
  expect(await screen.findByText("Ahoj, tady Lumi.")).toBeOnTheScreen();
  await user.type(screen.getByLabelText(/Jak ti máme říkat/), "Janko");
  await user.press(screen.getByRole("button", { name: "Pokračovat" }));
  await user.press(screen.getByRole("radio", { name: /do 26 let/ }));
  await user.press(screen.getByRole("button", { name: "Pokračovat" }));
  await user.press(screen.getByRole("button", { name: "Rozumím, jdeme na to" }));
  expect(await screen.findByText("Jak se dnes cítíš?")).toBeOnTheScreen();
}

/** Otevře check-in z Dnes, vybere stav a přejde na krok 2 (slova + štítky). */
async function openStep2(user: User, cta = "Začít check-in"): Promise<void> {
  await user.press(screen.getByRole("button", { name: cta }));
  expect(await screen.findByText("Jak se právě teď cítíš?")).toBeOnTheScreen();
  await user.press(screen.getByRole("radio", { name: /Napětí/ }));
  await user.press(screen.getByRole("button", { name: "Pokračovat" }));
  expect(await screen.findByText("Které slovo to vystihuje nejlíp?")).toBeOnTheScreen();
}

/** Texty všech tlačítek v pořadí vykreslení — kontrola pořadí chipů. */
function buttonNames(): string[] {
  return screen.getAllByRole("button").map((b) =>
    within(b)
      .queryAllByText(/.+/)
      .map((t) => String(t.props.children))
      .join(""),
  );
}

describe("Vlastní štítky", () => {
  it("přidá vlastní štítek: hned vybraný, řadí se za vestavěné a je v DB", async () => {
    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user);
    await openStep2(user);

    await user.press(screen.getByRole("button", { name: "+ přidat" }));
    // prázdný vstup nic nedělá — pole zůstává otevřené, DB beze změny
    await user.press(screen.getByRole("button", { name: "Přidat" }));
    expect(screen.getByLabelText("Nový štítek")).toBeOnTheScreen();
    expect(listCustomTags(getTestDb())).toHaveLength(0);

    await user.type(screen.getByLabelText("Nový štítek"), "terapie");
    await user.press(screen.getByRole("button", { name: "Přidat" }));

    // chip je hned vybraný, input se zavřel
    expect(await screen.findByRole("button", { name: "terapie" })).toBeSelected();
    expect(screen.queryByLabelText("Nový štítek")).toBeNull();

    // pořadí: za posledním vestavěným štítkem, před „+ přidat“
    const names = buttonNames();
    const lastBuiltin = CONTEXT_TAGS[CONTEXT_TAGS.length - 1];
    expect(names.indexOf("terapie")).toBeGreaterThan(names.indexOf(lastBuiltin));
    expect(names.indexOf("terapie")).toBeLessThan(names.indexOf("+ přidat"));

    // štítek je uložený v DB jako vlastní (ne vestavěný)
    const custom = listCustomTags(getTestDb());
    expect(custom).toHaveLength(1);
    expect(custom[0]).toMatchObject({ label: "terapie", builtin: false });
  });

  it("uložený zápis obsahuje vlastní štítek; duplicitní label se jen vybere", async () => {
    const user = userEvent.setup();
    await renderRouter("app");
    await finishOnboarding(user);
    await openStep2(user);

    await user.press(screen.getByRole("button", { name: "stres" }));
    await user.press(screen.getByRole("button", { name: "+ přidat" }));
    // potvrzení i klávesnicí (returnKeyType done → onSubmitEditing)
    await user.type(screen.getByLabelText("Nový štítek"), "terapie", { submitEditing: true });
    expect(await screen.findByRole("button", { name: "terapie" })).toBeSelected();

    // duplicitní label: žádný druhý chip ani druhý řádek v DB
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

  it("podržení vlastního chipu → potvrzení → štítek zmizí, starší záznamy zůstávají", async () => {
    const user = userEvent.setup();
    // Alert se v testu rovnou potvrdí destruktivním tlačítkem („Smazat“)
    jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => {
      buttons?.find((b) => b.style === "destructive")?.onPress?.();
    });
    await renderRouter("app");
    await finishOnboarding(user);

    // první zápis s vlastním štítkem — po smazání štítku musí zůstat beze změny
    await openStep2(user);
    await user.press(screen.getByRole("button", { name: "stres" }));
    await user.press(screen.getByRole("button", { name: "+ přidat" }));
    await user.type(screen.getByLabelText("Nový štítek"), "terapie", { submitEditing: true });
    await user.press(screen.getByRole("button", { name: "Uložit zápis" }));
    expect(await screen.findByText("Uloženo.")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Zpět na Dnes" }));
    expect(await screen.findByText(/Dnes zapsáno/)).toBeOnTheScreen();

    // druhý check-in: vybrat vestavěný i vlastní štítek, pak vlastní podržením smazat
    await openStep2(user, "Přidat další zápis");
    await user.press(screen.getByRole("button", { name: "obavy" }));
    await user.press(screen.getByRole("button", { name: "škola" }));
    await user.press(screen.getByRole("button", { name: "terapie" }));
    fireEvent(screen.getByRole("button", { name: "terapie" }), "longPress");

    expect(Alert.alert).toHaveBeenCalledWith(
      "Smazat štítek?",
      "Záznamy, kde už je použitý, zůstanou beze změny.",
      expect.any(Array),
    );

    // chip zmizel z nabídky i z DB; zbytek výběru v draftu zůstal
    // (potvrzení Alertu běží mimo userEvent → počkat na doběhnutí re-renderu)
    await waitFor(() => expect(screen.queryByRole("button", { name: "terapie" })).toBeNull());
    expect(listCustomTags(getTestDb())).toHaveLength(0);
    expect(screen.getByRole("button", { name: "škola" })).toBeSelected();
    expect(screen.getByRole("button", { name: "obavy" })).toBeSelected();

    // nový zápis se uloží bez smazaného štítku, starší záznam ho má pořád
    await user.press(screen.getByRole("button", { name: "Uložit zápis" }));
    expect(await screen.findByText("Uloženo.")).toBeOnTheScreen();
    const rows = listEntries(getTestDb());
    expect(rows).toHaveLength(2);
    const tagsByWords = Object.fromEntries(rows.map((r) => [r.words.join(","), r.tags]));
    expect(tagsByWords["stres"]).toEqual(["terapie"]); // starší záznam beze změny
    expect(tagsByWords["obavy"]).toEqual(["škola"]); // nový bez smazaného štítku
  });
});
