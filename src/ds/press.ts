/* Zpětná vazba stisku podle platformy: Android = Material ripple (state layer),
   iOS = snížená opacita (HIG: každé tlačítko má press state). */
import { Platform } from "react-native";
import type { PressableAndroidRippleConfig, StyleProp, ViewStyle } from "react-native";
import type { Theme } from "../theme";

export function pressFeedback(
  theme: Theme,
  options: { borderless?: boolean; radius?: number } = {},
): { android_ripple?: PressableAndroidRippleConfig } {
  if (Platform.OS !== "android") return {};
  return {
    android_ripple: {
      color: theme.ripple,
      borderless: !!options.borderless,
      radius: options.radius,
      foreground: true,
    },
  };
}

export function pressedStyle(theme: Theme, pressed: boolean): StyleProp<ViewStyle> {
  return Platform.OS !== "android" && pressed ? { opacity: theme.pressedOpacity } : null;
}
