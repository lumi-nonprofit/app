/* DS: přepínač pohledů a výběrový řádek pod Android presetem — role a stavy
   pro TalkBack, výběr nese accessibilityState (ne jen barva). */
import { render, screen, userEvent } from "@testing-library/react-native";
import { RadioRow, SegmentedControl } from "../src/ds";
import { ThemeProvider } from "../src/theme";

const PERIODS = [
  { value: "tyden", label: "týden" },
  { value: "mesic", label: "měsíc" },
] as const;

describe("SegmentedControl (Android: M3 segmented buttons)", () => {
  it("je radiogroup s radio segmenty; výběr nese stav a volá onChange", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    await render(
      <ThemeProvider>
        <SegmentedControl
          options={PERIODS}
          value="tyden"
          onChange={onChange}
          accessibilityLabel="Období"
        />
      </ThemeProvider>,
    );
    /* skupina není `accessible` (čtečka má procházet jednotlivé volby), proto podle popisku */
    expect(screen.getByLabelText("Období").props.accessibilityRole).toBe("radiogroup");
    expect(screen.getByRole("radio", { name: "týden" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "měsíc" })).not.toBeChecked();
    await user.press(screen.getByRole("radio", { name: "měsíc" }));
    expect(onChange).toHaveBeenCalledWith("mesic");
  });
});

describe("RadioRow", () => {
  it("jméno z textu volby, stav z accessibilityState, popis pod labelem", async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(
      <ThemeProvider>
        <RadioRow
          label="do 26 let"
          description="Linka bezpečí 116 111"
          selected
          onPress={onPress}
        />
        <RadioRow label="27 a více" selected={false} onPress={onPress} />
      </ThemeProvider>,
    );
    expect(screen.getByRole("radio", { name: /do 26 let/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /27 a více/ })).not.toBeChecked();
    expect(screen.getByText("Linka bezpečí 116 111")).toBeOnTheScreen();
    await user.press(screen.getByRole("radio", { name: /27 a více/ }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
