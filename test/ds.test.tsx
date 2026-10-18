/* DS: the view switch and the choice row under the Android preset. The roles and the states
   serve TalkBack; the selection carries accessibilityState, not only a colour. */
import { render, screen, userEvent } from "@testing-library/react-native";
import { RadioRow, SegmentedControl } from "../src/ds";
import { ThemeProvider } from "../src/theme";

const PERIODS = [
  { value: "tyden", label: "týden" },
  { value: "mesic", label: "měsíc" },
] as const;

describe("SegmentedControl (Android: M3 segmented buttons)", () => {
  it("is a radiogroup with radio segments; the selection carries the state and calls onChange", async () => {
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
    /* The group is not `accessible` (the screen reader walks through each choice), so the query uses the label. */
    expect(screen.getByLabelText("Období").props.accessibilityRole).toBe("radiogroup");
    expect(screen.getByRole("radio", { name: "týden" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "měsíc" })).not.toBeChecked();
    await user.press(screen.getByRole("radio", { name: "měsíc" }));
    expect(onChange).toHaveBeenCalledWith("mesic");
  });
});

describe("RadioRow", () => {
  it("takes the name from the choice text, the state from accessibilityState, the description under the label", async () => {
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
