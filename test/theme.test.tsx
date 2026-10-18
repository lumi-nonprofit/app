/* Typografie a téma: varianty ds/Text (Bricolage jen pro titulky, systémový
   font pro text), limity škálování, tmavé schéma podle systému, Bold Text
   a Dynamic Type (ring roste s písmem, ale jen do 1,3×). */
import { PixelRatio, StyleSheet } from "react-native";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { Button, ProgressRing, Text } from "../src/ds";
import { ThemeProvider, darkTheme, lightTheme } from "../src/theme";

const mockColorScheme = jest.fn<"light" | "dark" | null | undefined, []>(() => "light");
jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({
  __esModule: true,
  default: () => mockColorScheme(),
}));

const flat = (node: {
  props: { style?: StyleProp<TextStyle | ViewStyle> };
}): TextStyle & ViewStyle => (StyleSheet.flatten(node.props.style) ?? {}) as TextStyle & ViewStyle;

describe("ds/Text", () => {
  it("titulky nesou Bricolage, tělo textu systémový font se skutečnou váhou", async () => {
    await render(
      <ThemeProvider>
        <Text variant="title1">Titulek</Text>
        <Text variant="title3">Podtitulek</Text>
        <Text>Odstavec</Text>
        <Text variant="headline">Nadpis karty</Text>
      </ThemeProvider>,
    );
    expect(flat(screen.getByText("Titulek")).fontFamily).toBe("BricolageGrotesque_700Bold");
    expect(flat(screen.getByText("Podtitulek")).fontFamily).toBe("BricolageGrotesque_600SemiBold");
    const body = flat(screen.getByText("Odstavec"));
    expect(body.fontFamily).toBeUndefined();
    expect(body.fontWeight).toBe("400");
    /* Android preset: M3 bodyLarge 16/24 */
    expect(body.fontSize).toBe(16);
    expect(body.lineHeight).toBe(24);
    expect(flat(screen.getByText("Nadpis karty")).fontWeight).toBe("600");
  });

  it("Bold Text zvedne titulky 600 na 700 (iOS neumí ztučnit vlastní font)", async () => {
    await render(
      <ThemeProvider boldText>
        <Text variant="title3">Podtitulek</Text>
      </ThemeProvider>,
    );
    expect(flat(screen.getByText("Podtitulek")).fontFamily).toBe("BricolageGrotesque_700Bold");
  });

  it("kicker je verzálkový a škáluje nejvýš 1,6×; tlačítko 2×", async () => {
    await render(
      <ThemeProvider>
        <Text variant="kicker">Sekce</Text>
        <Button>Pokračovat</Button>
      </ThemeProvider>,
    );
    const kicker = screen.getByText("Sekce");
    expect(flat(kicker).textTransform).toBe("uppercase");
    expect(kicker.props.maxFontSizeMultiplier).toBe(1.6);
    expect(screen.getByText("Pokračovat").props.maxFontSizeMultiplier).toBe(2);
    /* bez limitu u běžného textu: Dynamic Type až 200 %+ */
    expect(screen.getByText("Sekce").props.allowFontScaling).not.toBe(false);
  });

  it("barvy jdou z rolí tématu — tmavé schéma podle systému", async () => {
    mockColorScheme.mockReturnValue("dark");
    await render(
      <ThemeProvider>
        <Text>Tmavý</Text>
        <Text color="textAccent">Akcent</Text>
      </ThemeProvider>,
    );
    expect(flat(screen.getByText("Tmavý")).color).toBe(darkTheme.colors.textBody);
    expect(flat(screen.getByText("Akcent")).color).toBe(darkTheme.colors.textAccent);
  });

  it("barvy jdou z rolí tématu — světlé schéma podle systému", async () => {
    mockColorScheme.mockReturnValue("light");
    await render(
      <ThemeProvider>
        <Text>Světlý</Text>
      </ThemeProvider>,
    );
    expect(flat(screen.getByText("Světlý")).color).toBe(lightTheme.colors.textBody);
  });
});

describe("Dynamic Type", () => {
  it("ring roste se systémovým písmem, ale nejvýš 1,3× (popisek se musí vejít)", async () => {
    jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(3.1);
    await render(
      <ThemeProvider>
        <ProgressRing value={0.8} size={72} label="80 %" sublabel="WHO-5" />
      </ThemeProvider>,
    );
    /* RNTL nemapuje roli progressbar na dotaz podle role — hledáme podle popisku */
    const ring = screen.getByLabelText("WHO-5");
    expect(ring.props.accessibilityRole).toBe("progressbar");
    expect(flat(ring).width).toBe(Math.round(72 * 1.3));
    expect(ring.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 80 });
    /* popisek v kruhu škáluje s průměrem, ne s písmem */
    expect(screen.getByText("80 %").props.allowFontScaling).toBe(false);
  });
});
