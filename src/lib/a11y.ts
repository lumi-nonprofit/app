/* Přístupnost — pomocné hooky a oznámení pro čtečky obrazovky.
   iOS nemá live regions (accessibilityLiveRegion je jen Android), proto změny
   stavu oznamujeme explicitně přes AccessibilityInfo.announceForAccessibility
   (HIG VoiceOver: „Inform VoiceOver when visible content or layout changes occur“).
   Všechna volání jsou bezpečná: na webu a při chybě nedělají nic. */
import React from "react";
import { AccessibilityInfo, Platform } from "react-native";

interface AnnounceOptions {
  /** iOS: zařadit za právě probíhající řeč místo přerušení (výchozí: přerušit). */
  queue?: boolean;
}

/** Oznámí text VoiceOveru / TalkBacku. Prázdný text se ignoruje. */
export function announce(message: string, options: AnnounceOptions = {}): void {
  const text = message.trim();
  if (!text || Platform.OS === "web") return;
  try {
    if (Platform.OS === "ios" && options.queue) {
      AccessibilityInfo.announceForAccessibilityWithOptions(text, { queue: true });
    } else {
      AccessibilityInfo.announceForAccessibility(text);
    }
  } catch {
    /* oznámení nikdy nesmí shodit interakci */
  }
}

type AccessibilityQuery = () => Promise<boolean>;
type AccessibilityEvent = "screenReaderChanged" | "boldTextChanged" | "reduceMotionChanged";

/** Sdílený vzor: počáteční dotaz + listener na změnu (hodnota se mění za běhu). */
function useAccessibilityFlag(query: AccessibilityQuery, event: AccessibilityEvent): boolean {
  const [enabled, setEnabled] = React.useState(false);
  React.useEffect(() => {
    if (Platform.OS === "web") return;
    let mounted = true;
    query()
      .then((value) => {
        if (mounted) setEnabled(!!value);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener(event, (value) => {
      if (mounted) setEnabled(!!value);
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, [query, event]);
  return enabled;
}

const queryScreenReader: AccessibilityQuery = () => AccessibilityInfo.isScreenReaderEnabled();
const queryBoldText: AccessibilityQuery = () =>
  Platform.OS === "ios" ? AccessibilityInfo.isBoldTextEnabled() : Promise.resolve(false);
const queryReduceMotion: AccessibilityQuery = () => AccessibilityInfo.isReduceMotionEnabled();

/** Je zapnutá čtečka obrazovky (VoiceOver / TalkBack)? */
export function useScreenReader(): boolean {
  return useAccessibilityFlag(queryScreenReader, "screenReaderChanged");
}

/** iOS „Bold Text“ — vlastní fonty ho neumí, titulky proto zvedáme o řez výš. */
export function useBoldText(): boolean {
  return useAccessibilityFlag(queryBoldText, "boldTextChanged");
}

/** Systémová redukce pohybu (HIG Motion / Android Remove animations). */
export function useReduceMotion(): boolean {
  return useAccessibilityFlag(queryReduceMotion, "reduceMotionChanged");
}
