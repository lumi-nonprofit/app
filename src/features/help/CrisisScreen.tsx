/* /crisis — modální pomoc mimo onboarding guard: statické linky, žádný profil,
   žádná databáze. Dostupná z onboardingu i odkudkoliv přes deep link. */
import { Text } from "../../ds";
import Screen from "../../components/Screen";
import CrisisLines from "./CrisisLines";

export default function CrisisScreen() {
  return (
    <Screen>
      <Text accessibilityRole="header" variant="title2">
        Pomoc je blízko
      </Text>
      <Text variant="body">
        Linky jsou zdarma a nonstop. Nemusíš vědět, co přesně říct — stačí zavolat.
      </Text>
      <CrisisLines />
    </Screen>
  );
}
