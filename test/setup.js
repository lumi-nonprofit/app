/* Jest setup — před každým testem vyčistí AsyncStorage (mock drží stav v paměti
   po celý testovací soubor), po každém testu obnoví spye (např. Linking.openURL).
   Unmount po renderu řeší auto-cleanup @testing-library/react-native.
   SafeAreaProvider čeká na nativní metriky, které v jestu nikdy nepřijdou —
   oficiální mock knihovny dodá nulové insety, takže děti se vykreslí. */
import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);

beforeEach(async () => {
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});
