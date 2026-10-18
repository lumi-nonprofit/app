/* WCAG 2.2 AA for both schemes. Each pair from the manifest must meet its threshold (text
   4.5:1, non-text elements 3:1). Each `text-` and `border-` token must be in the manifest:
   a new color without a check fails the test. */
import { contrastPairs, contrastRatio, darkTheme, lightTheme } from "../src/theme";

describe.each([
  ["light", lightTheme],
  ["dark", darkTheme],
] as const)("contrast %s", (_name, theme) => {
  const pairs = contrastPairs(theme);

  it("covers all text and border roles in the manifest", () => {
    const covered = new Set(pairs.flatMap((p) => [p.fg, p.bg]));
    /* `borderSubtle` is only decorative (hairline, divider), without a contrast requirement. */
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
