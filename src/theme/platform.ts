/* The platform constants of the interface (HIG compared with the Android design guidelines). */
import { Platform } from "react-native";
import type { ThemePlatform } from "./types";

const isIOS = Platform.OS === "ios";
const isAndroid = Platform.OS === "android";

export const platform: ThemePlatform = {
  minTouch: isAndroid ? 48 : 44,
  screenMargin: isAndroid ? 16 : 20,
  listRowMinHeight: isAndroid ? 56 : 44,
  headerTitleSize: isAndroid ? 22 : 17,
  isIOS,
  isAndroid,
};
