/* Jest setup of the web project (jest-expo/web). The design-system components render with
   react-native-web in jsdom, and jest-axe runs axe-core on the DOM (test/a11y/ds.web.test.tsx).
   The native modules below have no implementation in jsdom, so this file replaces them. */
import { toHaveNoViolations } from "jest-axe";
import { initI18n } from "../src/i18n";

expect.extend(toHaveNoViolations);

/* The tests run in the source locale (cs). expo-localization has no module in jsdom. */
jest.mock("expo-localization", () => ({
  getLocales: () => [
    { languageCode: "cs", languageTag: "cs-CZ", regionCode: "CZ", textDirection: "ltr" },
  ],
}));
initI18n({ lng: "cs" });

/* SafeAreaProvider waits for native metrics that never come in Jest. The mock of the package
   gives zero insets, so the children render. */
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

/* expo-symbols: on the web, Icon draws Lucide. The import of the native module fails in jsdom,
   so SymbolView becomes an empty View of the same size. */
jest.mock("expo-symbols", () => {
  const React = jest.requireActual("react");
  const { View } = jest.requireActual("react-native-web");
  return {
    SymbolView: (props: { size?: number; style?: unknown }) =>
      React.createElement(View, {
        style: [{ width: props.size, height: props.size }, props.style],
      }),
  };
});

/* expo-haptics: RadioRow calls the haptics module on a press. The web has no haptics. */
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  selectionAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
}));

/* expo-router: the onboarding shell uses the router and the screens use Stack.Screen. The
   components render without a navigator, so navigation is a no-op here. */
jest.mock("expo-router", () => {
  const React = jest.requireActual("react");
  const { Text } = jest.requireActual("react-native-web");
  const router = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
    dismiss: jest.fn(),
    dismissAll: jest.fn(),
    canGoBack: () => false,
  };
  return {
    useRouter: () => router,
    router,
    Link: ({ children, ...rest }: { children?: unknown }) =>
      React.createElement(Text, { accessibilityRole: "link", ...rest }, children),
    Stack: { Screen: () => null },
    Redirect: () => null,
    useLocalSearchParams: () => ({}),
  };
});
