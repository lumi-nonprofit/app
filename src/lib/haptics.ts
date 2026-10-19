/* Centralized haptics: discreet and always through this module.
   The HIG guidance on haptics: the system patterns with their documented meaning,
   consistent, as a complement to other feedback, and always with an OFF switch ("Nastavení").
   The web has no haptics → no-op. The module swallows errors: haptics must never break
   an interaction. */
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

let enabled = true;
const supported = Platform.OS !== "web";
const active = () => supported && enabled;

const swallow = (p: Promise<unknown>) => {
  p.catch(() => {});
};

export const haptics = {
  /** The user choice from "Nastavení" (the default is on). */
  setEnabled(value: boolean): void {
    enabled = value;
  },
  isEnabled(): boolean {
    return enabled;
  },
  /** The start of the inhale (the breath ring). */
  inhale(): void {
    if (active()) swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
  /** The start of the exhale (the breath ring). */
  exhale(): void {
    if (active()) swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  },
  /** The save of a check-in and similar completed actions. */
  success(): void {
    if (active()) swallow(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  /** Before a destructive confirmation (discard of unsaved work, delete). */
  warning(): void {
    if (active()) swallow(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  },
  /** The action failed (export or import of a backup, print). */
  error(): void {
    if (active()) swallow(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  },
  /** The selection of a mood, a word, a tag, an answer. */
  select(): void {
    if (active()) swallow(Haptics.selectionAsync());
  },
  /* --- "Dech naslepo": the breath guide without the screen, stronger patterns --- */
  /** A strong pulse: the start of the blind inhale. */
  strongPulse(): void {
    if (active()) swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
  },
  /** A double pulse: the start of the blind exhale. */
  doublePulse(): void {
    if (!active()) return;
    swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
    setTimeout(() => {
      if (active()) swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
    }, 140);
  },
  /** A gentle tick: the middle of the hold in 4-7-8. */
  tick(): void {
    if (active()) swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
};
