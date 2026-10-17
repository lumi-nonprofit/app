/* Centralizovaná haptika — decentně a vždy přes tenhle modul.
   HIG Playing haptics: systémové vzory podle dokumentovaného významu,
   konzistentně, jako doplněk jiné zpětné vazby, a vždy VYPNUTELNÁ (Nastavení).
   Web nemá haptiku → no-op. Chyby polykáme — haptika nikdy nesmí shodit
   interakci. */
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

let enabled = true;
const supported = Platform.OS !== "web";
const active = () => supported && enabled;

const swallow = (p: Promise<unknown>) => {
  p.catch(() => {});
};

export const haptics = {
  /** Uživatelská volba z Nastavení (výchozí zapnuto). */
  setEnabled(value: boolean): void {
    enabled = value;
  },
  isEnabled(): boolean {
    return enabled;
  },
  /** Začátek nádechu (dechový kruh). */
  inhale(): void {
    if (active()) swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
  /** Začátek výdechu (dechový kruh). */
  exhale(): void {
    if (active()) swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  },
  /** Uložení check-inu a podobné dokončené akce. */
  success(): void {
    if (active()) swallow(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  /** Před destruktivním potvrzením (zahození rozepsané práce, smazání). */
  warning(): void {
    if (active()) swallow(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  },
  /** Akce se nezdařila (export/import zálohy, tisk). */
  error(): void {
    if (active()) swallow(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  },
  /** Výběr stavu, slova, štítku, odpovědi. */
  select(): void {
    if (active()) swallow(Haptics.selectionAsync());
  },
  /* --- Dech naslepo: vedení dechu poslepu, výraznější vzorce --- */
  /** Výrazný impulz — začátek nádechu naslepo. */
  strongPulse(): void {
    if (active()) swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
  },
  /** Dvojitý impulz — začátek výdechu naslepo. */
  doublePulse(): void {
    if (!active()) return;
    swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
    setTimeout(() => {
      if (active()) swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
    }, 140);
  },
  /** Jemný tik — střed zádrže u 4-7-8. */
  tick(): void {
    if (active()) swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
};
