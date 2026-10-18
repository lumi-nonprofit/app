/* Items of the native header. iOS: real UIBarButtonItems through
   `unstable_headerLeftItems/RightItems` (SF Symbols, Liquid Glass, text for "Zrušit" and
   "Hotovo", HIG Toolbars). Android and web: elements in `headerLeft/Right` with a ripple and a
   48 dp target (Material top app bar); Jest can query them by role and label. The label comes
   from the message catalog: on iOS an icon item uses it only for VoiceOver. */
import React from "react";
import { View } from "react-native";
import type { NativeStackHeaderItem, NativeStackNavigationOptions } from "expo-router";
import type { SFSymbol } from "sf-symbols-typescript";
import { Button, IconButton } from "../ds";
import type { IconName } from "../ds/Icon";
import i18n from "../i18n";
import type { Theme } from "../theme";

export interface HeaderItemSpec {
  /** The label from the catalog: the text of an item without an icon, otherwise the screen reader label. */
  label: string;
  /** The icon for Android/web (Lucide) and iOS (SF Symbol); without an icon the item is text. */
  icon?: IconName;
  sf?: SFSymbol;
  onPress: () => void;
  /** The prominent main action ("Hotovo"): iOS prominent, Android primary text. */
  prominent?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
}

interface HeaderItemsSpec {
  left?: HeaderItemSpec[];
  right?: HeaderItemSpec[];
}

function toNativeItem(spec: HeaderItemSpec): NativeStackHeaderItem {
  return {
    type: "button",
    label: spec.label,
    icon: spec.sf ? { type: "sfSymbol", name: spec.sf } : undefined,
    variant: spec.prominent ? "prominent" : "plain",
    disabled: spec.disabled,
    onPress: spec.onPress,
  };
}

function HeaderItemRow({ items, side }: { items: HeaderItemSpec[]; side: "left" | "right" }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      {items.map((item) =>
        item.icon ? (
          <IconButton
            key={item.label}
            icon={item.icon}
            label={item.label}
            accessibilityHint={item.accessibilityHint}
            onPress={item.onPress}
            style={side === "left" ? { marginLeft: -8 } : { marginRight: -8 }}
          />
        ) : (
          <Button
            key={item.label}
            variant={item.prominent ? "soft" : "ghost"}
            size="sm"
            disabled={item.disabled}
            accessibilityHint={item.accessibilityHint}
            onPress={item.onPress}
          >
            {item.label}
          </Button>
        ),
      )}
    </View>
  );
}

/** The screen options with header items: `<Stack.Screen options={{ title, ...headerItems(theme, {...}) }} />`. */
export function headerItems(theme: Theme, spec: HeaderItemsSpec): NativeStackNavigationOptions {
  if (theme.platform.isIOS) {
    return {
      unstable_headerLeftItems: spec.left ? () => spec.left!.map(toNativeItem) : undefined,
      unstable_headerRightItems: spec.right ? () => spec.right!.map(toNativeItem) : undefined,
    };
  }
  return {
    headerLeft: spec.left ? () => <HeaderItemRow items={spec.left!} side="left" /> : undefined,
    headerRight: spec.right ? () => <HeaderItemRow items={spec.right!} side="right" /> : undefined,
  };
}

/** The standard close item (HIG: xmark / Material: close) for modal tasks. */
export function closeItem(
  onPress: () => void,
  label: string = i18n.t("navigation:actions.close"),
): HeaderItemSpec {
  return { label, icon: "close", sf: "xmark", onPress };
}

/** Back inside one screen (a questionnaire step), with the look of the system back button. */
export function backItem(
  onPress: () => void,
  label: string = i18n.t("navigation:actions.back"),
): HeaderItemSpec {
  return { label, icon: "arrow-left", sf: "chevron.backward", onPress };
}
