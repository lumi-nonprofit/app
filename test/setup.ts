/* Jest setup. Before each test it replaces the in-memory SQLite with a clean one. After each
   test it restores the spies (for example `Linking.openURL`).
   The auto-cleanup of `@testing-library/react-native` unmounts the tree after each render.
   `SafeAreaProvider` waits for native metrics that never come in Jest: the official mock of
   the library gives zero insets, so the children render.
   A better-sqlite3 mock replaces the native encrypted SQLite (same schema, same migrations),
   see `helpers/testDb`. */
import { __resetTestDb as resetTestDb } from "./helpers/testDb";
import { initI18n } from "../src/i18n";

/* The tests run in the source locale (cs) and assert the visible Czech text: that proves that
   the catalogs reproduce the user interface. expo-localization has no native module in Jest. */
jest.mock("expo-localization", () => ({
  getLocales: () => [
    { languageCode: "cs", languageTag: "cs-CZ", regionCode: "CZ", textDirection: "ltr" },
  ],
}));
initI18n({ lng: "cs" });

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

jest.mock("../src/db/connect", () => jest.requireActual("./helpers/testDb"));

/* expo-audio has no native module in Jest (the import would fail). The player uses it only
   for audio with a file, so a no-op is enough in the tests. */
jest.mock("expo-audio", () => ({
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  useAudioPlayer: () => ({
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(),
    remove: jest.fn(),
  }),
  useAudioPlayerStatus: () => ({
    playing: false,
    currentTime: 0,
    duration: 0,
    didJustFinish: false,
  }),
}));

/* `@react-native-community/datetimepicker` requires the native module `RNCDatePicker` under
   the Android preset. The tests never touch the time picker, so a silent component is
   enough. */
jest.mock("@react-native-community/datetimepicker", () => {
  const React = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  const DateTimePicker = (props: { accessibilityLabel?: string }) =>
    React.createElement(View, {
      testID: "datetimepicker",
      accessibilityLabel: props.accessibilityLabel,
    });
  return {
    __esModule: true,
    default: DateTimePicker,
    DateTimePickerAndroid: { open: jest.fn(), dismiss: jest.fn() },
  };
});

/* expo-notifications: under the Android preset Jest simulates Expo Go, and the module throws
   an error on import ("push notifications removed from Expo Go"). The local scheduling gets
   a global mock here; the reminders test overrides this mock with its own. */
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  scheduleNotificationAsync: jest.fn(async () => "id"),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  setNotificationChannelAsync: jest.fn(async () => null),
  SchedulableTriggerInputTypes: { DAILY: "daily", WEEKLY: "weekly" },
  AndroidImportance: { DEFAULT: 3 },
  AndroidNotificationVisibility: { PRIVATE: 0, PUBLIC: 1, SECRET: -1 },
}));

/* `Pressable.android_ripple` calls the native command `hotspotUpdate`, which the mock `View`
   in Jest does not have (an RN limitation). The ripple is only visual, so the tests turn it
   off. */
jest.mock("react-native/Libraries/Components/Pressable/useAndroidRippleForView", () => ({
  __esModule: true,
  default: () => null,
}));

/* expo-symbols: Jest has no SF Symbols and no Material Symbols font. The icons are decorative,
   so an empty `View` with the same size is enough. */
jest.mock("expo-symbols", () => {
  const React = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  return {
    SymbolView: (props: { size?: number; style?: unknown }) =>
      React.createElement(View, {
        style: [{ width: props.size, height: props.size }, props.style],
      }),
    /* The native tabs on Android draw the Material icons as images; in Jest the icon is empty. */
    unstable_getMaterialSymbolSourceAsync: jest.fn(async () => null),
  };
});

/* The native tabs (react-native-screens) have no JS tab bar in Jest, see `mocks/nativeTabs`. */
jest.mock("expo-router/unstable-native-tabs", () => jest.requireActual("./mocks/nativeTabs"));

/* expo-print: the print of the card returns a fake file in the test. */
jest.mock("expo-print", () => ({
  printToFileAsync: jest.fn(async () => ({ uri: "file:///tmp/lumi-karticka.pdf" })),
}));

beforeEach(() => {
  resetTestDb();
});

afterEach(() => {
  jest.restoreAllMocks();
});
