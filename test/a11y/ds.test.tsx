/* The accessibility contract of the design system under the Android preset: every component
   exposes its role, its name and its state to TalkBack, and the audit of test/a11y/audit.ts
   finds nothing. RadioRow and SegmentedControl have their own interaction tests in
   test/ds.test.tsx. */
import React from "react";
import { render, screen } from "@testing-library/react-native";
import {
  Badge,
  Button,
  Card,
  Chip,
  IconButton,
  Input,
  ListItem,
  ProgressRing,
  RadioRow,
  SegmentedControl,
  Switch,
  Text,
} from "../../src/ds";
import { ThemeProvider } from "../../src/theme";
import { auditTree, formatViolations } from "./audit";

const noop = () => {};
const AUDIT = { minTouch: 48, requireHeader: false };

async function mount(ui: React.ReactElement): Promise<void> {
  await render(<ThemeProvider>{ui}</ThemeProvider>);
}

const expectClean = () =>
  expect(formatViolations(auditTree(screen.toJSON(), AUDIT).violations)).toEqual([]);

describe("design system: roles, names and states", () => {
  it("Button is a button with its text as the name; a link with href", async () => {
    await mount(
      <>
        <Button onPress={noop}>Uložit</Button>
        <Button href="tel:116111">Zavolat 116 111</Button>
      </>,
    );
    expect(screen.getByRole("button", { name: "Uložit" })).toBeOnTheScreen();
    expect(screen.getByRole("link", { name: "Zavolat 116 111" })).toBeOnTheScreen();
    expectClean();
  });

  it("Button reports the disabled and the busy state", async () => {
    await mount(
      <>
        <Button disabled hint="Nejdřív vyber stav." onPress={noop}>
          Pokračovat
        </Button>
        <Button loading loadingLabel="Ukládám…" onPress={noop}>
          Uložit
        </Button>
      </>,
    );
    expect(screen.getByRole("button", { name: "Pokračovat" })).toBeDisabled();
    expect(screen.getByText("Nejdřív vyber stav.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Ukládám…" })).toBeBusy();
    expectClean();
  });

  it("IconButton has the label as its name and a 48 dp target", async () => {
    await mount(<IconButton icon="close" label="Zavřít" onPress={noop} />);
    expect(screen.getByRole("button", { name: "Zavřít" })).toBeOnTheScreen();
    expectClean();
  });

  it("Chip is a button that carries the selected state", async () => {
    await mount(
      <>
        <Chip selected onPress={noop}>
          stres
        </Chip>
        <Chip onPress={noop}>obavy</Chip>
      </>,
    );
    expect(screen.getByRole("button", { name: "stres" })).toBeSelected();
    expect(screen.getByRole("button", { name: "obavy" })).not.toBeSelected();
    expectClean();
  });

  it("Switch is a switch with the label as its name and the checked state", async () => {
    await mount(
      <>
        <Switch checked label="Sdílet data" description="Anonymně." onChange={noop} />
        <Switch label="Haptika" onChange={noop} />
      </>,
    );
    expect(screen.getByRole("switch", { name: "Sdílet data" })).toBeChecked();
    expect(screen.getByRole("switch", { name: "Haptika" })).not.toBeChecked();
    expectClean();
  });

  it("RadioRow and SegmentedControl pass the audit", async () => {
    await mount(
      <>
        <RadioRow label="do 26 let" description="Linka bezpečí" selected onPress={noop} />
        <SegmentedControl
          options={[
            { value: "week", label: "týden" },
            { value: "month", label: "měsíc" },
          ]}
          value="week"
          onChange={noop}
          accessibilityLabel="Období"
        />
      </>,
    );
    expect(screen.getByRole("radio", { name: /do 26 let/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: "týden" })).toBeChecked();
    expectClean();
  });

  it("ListItem is a button or a link with the title as its name", async () => {
    await mount(
      <>
        <ListItem icon="wind" title="Rychlé zklidnění" subtitle="Dech" onPress={noop} />
        <ListItem icon="phone" title="Zavolat 155" href="tel:155" />
      </>,
    );
    expect(screen.getByRole("button", { name: /Rychlé zklidnění/ })).toBeOnTheScreen();
    expect(screen.getByRole("link", { name: /Zavolat 155/ })).toBeOnTheScreen();
    expectClean();
  });

  it("Input has the label as its name and shows the error text", async () => {
    await mount(
      <>
        <Input label="Jak ti říkat" placeholder="Třeba Alex" hint="Nepovinné" />
        <Input label="Poznámka" multiline error="Použij jen písmena." />
      </>,
    );
    expect(screen.getByLabelText("Jak ti říkat")).toBeOnTheScreen();
    expect(screen.getByLabelText("Poznámka")).toBeOnTheScreen();
    expect(screen.getByText("Použij jen písmena.")).toBeOnTheScreen();
    expectClean();
  });

  it("ProgressRing is a progressbar with a name and a value", async () => {
    await mount(<ProgressRing value={0.72} label="72 %" sublabel="WHO-5" />);
    const ring = screen.getByRole("progressbar");
    expect(ring).toHaveAccessibilityValue({ now: 72 });
    expect(ring.props.accessibilityLabel).toBe("WHO-5");
    expectClean();
  });

  it("Badge and a pressable Card expose their text", async () => {
    await mount(
      <>
        <Badge tone="accent">5 min</Badge>
        <Card onPress={noop}>
          <Text variant="headline">Index pohody</Text>
        </Card>
      </>,
    );
    expect(screen.getByText("5 min")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Index pohody" })).toBeOnTheScreen();
    expectClean();
  });
});
