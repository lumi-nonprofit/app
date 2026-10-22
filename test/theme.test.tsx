/* Typography and theme: the ds/Text variants (Bricolage only for the titles, the system font for
   the body text), the scale limits, the dark scheme from the system, Bold Text and Dynamic Type
   (the ring grows with the font, but only to 1.3x). */
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
  it("titles use Bricolage, the body text uses the system font with a real weight", async () => {
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

  it("Bold Text raises the titles from 600 to 700 (iOS cannot embolden a custom font)", async () => {
    await render(
      <ThemeProvider boldText>
        <Text variant="title3">Podtitulek</Text>
      </ThemeProvider>,
    );
    expect(flat(screen.getByText("Podtitulek")).fontFamily).toBe("BricolageGrotesque_700Bold");
  });

  it("the kicker is uppercase and scales at most 1.6x; the button 2x", async () => {
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
    /* No limit for the body text: Dynamic Type up to 200 % and more. */
    expect(screen.getByText("Sekce").props.allowFontScaling).not.toBe(false);
  });

  it("colours come from the theme roles: the dark scheme follows the system", async () => {
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

  it("colours come from the theme roles: the light scheme follows the system", async () => {
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
  it("the ring grows with the system font, but at most 1.3x (the label must fit)", async () => {
    jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(3.1);
    await render(
      <ThemeProvider>
        <ProgressRing value={0.8} size={72} label="80 %" sublabel="WHO-5" />
      </ThemeProvider>,
    );
    /* RNTL does not map the progressbar role to a role query, so the test queries the label. */
    const ring = screen.getByLabelText("WHO-5");
    expect(ring.props.accessibilityRole).toBe("progressbar");
    expect(flat(ring).width).toBe(Math.round(72 * 1.3));
    expect(ring.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 80 });
    /* The label in the ring scales with the diameter, not with the font. */
    expect(screen.getByText("80 %").props.allowFontScaling).toBe(false);
  });
});
