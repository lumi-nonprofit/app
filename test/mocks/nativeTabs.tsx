/* NativeTabs v jestu: nativní tab bar (RNSTabsHost) nemá žádné JS prvky
   a vykresluje všechny taby najednou. Testy proto dostanou JS Tabs se
   standardní lištou — položky mají roli „tab“ a popisek z Trigger.Label,
   přepíná se jen aktivní tab. Vzhled nativního baru ověřuje zařízení. */
import React from "react";
import { Tabs } from "expo-router/tabs";

interface TriggerProps {
  name: string;
  hidden?: boolean;
  children?: React.ReactNode;
}

function Label(_props: { children?: string; hidden?: boolean }) {
  return null;
}
function Icon(_props: Record<string, unknown>) {
  return null;
}
function Badge(_props: { children?: string }) {
  return null;
}
function Trigger(_props: TriggerProps) {
  return null;
}
Trigger.Label = Label;
Trigger.Icon = Icon;
Trigger.Badge = Badge;

function labelOf(children: React.ReactNode): string | undefined {
  let label: string | undefined;
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === Label) {
      const text = (child.props as { children?: string }).children;
      if (typeof text === "string") label = text;
    }
  });
  return label;
}

export function NativeTabs({ children }: { children?: React.ReactNode }) {
  const screens: React.ReactElement[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child) || child.type !== Trigger) return;
    const props = child.props as TriggerProps;
    screens.push(
      <Tabs.Screen
        key={props.name}
        name={props.name}
        options={{
          title: labelOf(props.children) ?? props.name,
          /* jméno položky přesně = popisek (bez zástupné ikony), ikona nativní */
          tabBarAccessibilityLabel: labelOf(props.children) ?? props.name,
          tabBarIcon: () => null,
        }}
      />,
    );
  });
  return <Tabs screenOptions={{ headerShown: false }}>{screens}</Tabs>;
}
NativeTabs.Trigger = Trigger;
