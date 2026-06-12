/* Centralizovaná haptika — decentně a vždy přes tenhle modul.
   Web nemá haptiku → no-op. Systémová nastavení neřešíme: když má
   uživatel vibrace vypnuté, systém volání ztlumí sám (API pro zjištění
   stavu vibrací Expo nenabízí). Chyby polykáme — haptika nikdy nesmí
   shodit interakci. */
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

const active = Platform.OS !== "web";

export const haptics = {
  /** Začátek nádechu (dechový kruh). */
  inhale(): void {
    if (active) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  /** Začátek výdechu (dechový kruh). */
  exhale(): void {
    if (active) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  /** Uložení check-inu a podobné dokončené akce. */
  success(): void {
    if (active) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  /** Výběr stavu, slova, štítku. */
  select(): void {
    if (active) Haptics.selectionAsync().catch(() => {});
  },
};
