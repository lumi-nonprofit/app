/* axe-core over the design system on the web (react-native-web in jsdom). The web export of the
   app is blank (expo-sqlite has no web build), so axe checks the components and the screens that
   need no database, not the whole app. The contrast and the target size rules are off here: jsdom
   has no layout. test/contrast.test.ts and the audit in test/a11y/screens.test.tsx cover them. */
import React from "react";
import { render } from "@testing-library/react";
import { axe } from "jest-axe";
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
import type { ThemeScheme } from "../../src/theme/types";
import CrisisFallback from "../../src/features/help/CrisisFallback";
import { ObShell, ObTitle } from "../../src/features/onboarding/Shell";

/* The option type of jest-axe (its own axe-core version), not the top-level axe-core package. */
const AXE_OPTIONS: NonNullable<Parameters<typeof axe>[1]> = {
  runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
  rules: { "color-contrast": { enabled: false }, "target-size": { enabled: false } },
};
const noop = () => {};
const SCHEMES: ThemeScheme[] = ["light", "dark"];

/* Every component in its states. The texts are Czech: the tests run in the source locale. */
const CASES: [string, React.ReactElement][] = [
  ["Button", <Button onPress={noop}>Pokračovat</Button>],
  [
    "Button disabled with a hint",
    <Button disabled onPress={noop} hint="Nejdřív vyber stav.">
      Pokračovat
    </Button>,
  ],
  [
    "Button loading",
    <Button loading loadingLabel="Ukládám…" onPress={noop}>
      Uložit
    </Button>,
  ],
  ["Button as a link", <Button href="tel:116111">Zavolat 116 111</Button>],
  ["IconButton", <IconButton icon="close" label="Zavřít" onPress={noop} />],
  [
    "Chip",
    <>
      <Chip selected onPress={noop}>
        stres
      </Chip>
      <Chip onPress={noop}>obavy</Chip>
    </>,
  ],
  [
    "Switch",
    <>
      <Switch checked label="Sdílet data" description="Anonymně." onChange={noop} />
      <Switch label="Haptika" onChange={noop} />
    </>,
  ],
  [
    "RadioRow",
    <>
      <RadioRow label="do 26 let" description="Linka bezpečí" selected onPress={noop} />
      <RadioRow label="27 a více" selected={false} onPress={noop} />
    </>,
  ],
  [
    "SegmentedControl",
    <SegmentedControl
      options={[
        { value: "week", label: "týden" },
        { value: "month", label: "měsíc" },
      ]}
      value="week"
      onChange={noop}
      accessibilityLabel="Období"
    />,
  ],
  [
    "ListItem",
    <>
      <ListItem icon="wind" title="Rychlé zklidnění" subtitle="Dech" onPress={noop} />
      <ListItem icon="phone" title="Zavolat 155" href="tel:155" />
      <ListItem title="Procházka" disabled />
    </>,
  ],
  [
    "Input",
    <>
      <Input label="Jak ti říkat" placeholder="Třeba Alex" hint="Nepovinné" />
      <Input label="Poznámka" multiline error="Použij jen písmena." />
    </>,
  ],
  ["Badge", <Badge tone="accent">5 min</Badge>],
  ["ProgressRing", <ProgressRing value={0.5} label="50 %" sublabel="WHO-5" />],
  [
    "Card pressable",
    <Card onPress={noop}>
      <Text variant="headline">Index pohody</Text>
    </Card>,
  ],
  [
    "Text header",
    <Text accessibilityRole="header" variant="title2">
      Nadpis
    </Text>,
  ],
  [
    "CrisisFallback",
    <CrisisFallback
      title="Něco se nepovedlo"
      message="Zkus to znovu."
      action={<Button onPress={noop}>Zkusit znovu</Button>}
    />,
  ],
  [
    "Onboarding shell",
    <ObShell step={2} onBack={noop}>
      <ObTitle title="Kolik ti je?" body="Podle věku vybereme linku." />
    </ObShell>,
  ],
];

describe.each(SCHEMES)("design system on the web (%s scheme)", (scheme) => {
  it.each(CASES)("%s has no axe violations", async (_name, ui) => {
    const { container, unmount } = render(<ThemeProvider scheme={scheme}>{ui}</ThemeProvider>);
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();
    unmount();
  });
});
