/* Jest setup — před každým testem vyčistí AsyncStorage (mock drží stav v paměti
   po celý testovací soubor) a vymění in-memory SQLite za čistou, po každém
   testu obnoví spye (např. Linking.openURL).
   Unmount po renderu řeší auto-cleanup @testing-library/react-native.
   SafeAreaProvider čeká na nativní metriky, které v jestu nikdy nepřijdou —
   oficiální mock knihovny dodá nulové insety, takže děti se vykreslí.
   Nativní šifrovaná SQLite se mockuje na better-sqlite3 (stejné schéma,
   stejné migrace) — viz helpers/testDb. */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { __resetTestDb } from "./helpers/testDb";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

jest.mock("../src/db/connect", () => jest.requireActual("./helpers/testDb"));

/* expo-audio nemá v jestu nativní modul (spadl by na importu); přehrávač ho
   používá jen pro audio se souborem, v testech stačí no-op. */
jest.mock("expo-audio", () => ({
  setAudioModeAsync: jest.fn(async () => {}),
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

/* expo-print: tisk kartičky vrací v testu fiktivní soubor. */
jest.mock("expo-print", () => ({
  printToFileAsync: jest.fn(async () => ({ uri: "file:///tmp/lumi-karticka.pdf" })),
}));

beforeEach(async () => {
  await AsyncStorage.clear();
  __resetTestDb();
});

afterEach(() => {
  jest.restoreAllMocks();
});
