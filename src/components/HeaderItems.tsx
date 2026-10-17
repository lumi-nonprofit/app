/* Položky nativní hlavičky. iOS: skutečné UIBarButtonItems přes
   `unstable_headerLeftItems/RightItems` (SF Symbols, Liquid Glass, text pro
   Zrušit/Hotovo — HIG Toolbars). Android a web: prvky v `headerLeft/Right`
   s ripple a 48 dp cílem (Material top app bar), v jestu dotazovatelné podle
   role a popisku. Popisek je vždy česky: na iOS u ikony jen pro VoiceOver. */
import React from "react";
import { View } from "react-native";
import type { NativeStackHeaderItem, NativeStackNavigationOptions } from "expo-router";
import type { SFSymbol } from "sf-symbols-typescript";
import { Button, IconButton } from "../ds";
import type { IconName } from "../ds/Icon";
import type { Theme } from "../theme";

export interface HeaderItemSpec {
  /** Český popisek: text položky bez ikony, jinak label pro čtečku. */
  label: string;
  /** Ikona pro Android/web (lucide) a iOS (SF Symbol); bez ikony = textová položka. */
  icon?: IconName;
  sf?: SFSymbol;
  onPress: () => void;
  /** Zvýrazněná hlavní akce (Hotovo): iOS prominent, Android primární text. */
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

/** Volby obrazovky s položkami hlavičky: `<Stack.Screen options={{ title, ...headerItems(theme, {...}) }} />` */
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

/** Standardní Zavřít (HIG: xmark / Material: close) pro modální úlohy. */
export function closeItem(onPress: () => void, label = "Zavřít"): HeaderItemSpec {
  return { label, icon: "close", sf: "xmark", onPress };
}

/** Zpět v rámci jedné obrazovky (krok dotazníku) — vzhled systémového Zpět. */
export function backItem(onPress: () => void, label = "Zpět"): HeaderItemSpec {
  return { label, icon: "arrow-left", sf: "chevron.backward", onPress };
}
