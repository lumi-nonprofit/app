/* WCAG 2.2 AA pro obě schémata: každý pár z manifestu musí splnit svůj práh
   (text 4,5:1; ne-textové prvky 3:1) a každý text- a border- token musí být
   v manifestu — nová barva bez kontroly test neprojde. */
import { contrastPairs, contrastRatio, darkTheme, lightTheme } from "../src/theme";

describe.each([
  ["light", lightTheme],
  ["dark", darkTheme],
] as const)("kontrast %s", (_name, theme) => {
  const pairs = contrastPairs(theme);

  it("manifest pokrývá všechny textové a obrysové role", () => {
    const covered = new Set(pairs.flatMap((p) => [p.fg, p.bg]));
    /* borderSubtle je čistě dekorativní (hairline, oddělovač) — bez požadavku na kontrast */
    const roles = Object.entries(theme.colors).filter(
      ([k]) => /^(text|border)/.test(k) && k !== "borderSubtle",
    );
    for (const [role, value] of roles)
      expect({ role, covered: covered.has(value) }).toEqual({ role, covered: true });
  });

  it.each(pairs.map((p) => [p.name, p]))("%s", (_n, pair) => {
    const ratio = contrastRatio(pair.fg, pair.bg);
    expect({
      pair: pair.name,
      fg: pair.fg,
      bg: pair.bg,
      ratio: Math.round(ratio * 100) / 100,
    }).toEqual(expect.objectContaining({ ratio: expect.any(Number) }));
    expect(ratio).toBeGreaterThanOrEqual(pair.min);
  });
});
