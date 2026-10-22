/* Accessibility: helper hooks and announcements for screen readers.
   iOS has no live regions (`accessibilityLiveRegion` is Android only), thus the app
   announces state changes explicitly through `AccessibilityInfo.announceForAccessibility`
   (HIG VoiceOver: "Inform VoiceOver when visible content or layout changes occur").
   Every call is safe: on the web and on an error it does nothing. */
import React from "react";
import { AccessibilityInfo, Platform } from "react-native";

interface AnnounceOptions {
  /** iOS: queue after the current speech instead of an interruption (default: interrupt). */
  queue?: boolean;
}

/** Announces the text to VoiceOver / TalkBack. It ignores an empty text. */
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
    /* an announcement must never break an interaction */
  }
}

type AccessibilityQuery = () => Promise<boolean>;
type AccessibilityEvent = "screenReaderChanged" | "boldTextChanged" | "reduceMotionChanged";

/** The shared pattern: an initial query + a change listener (the value changes at runtime). */
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

/** Is the screen reader (VoiceOver / TalkBack) on? */
export function useScreenReader(): boolean {
  return useAccessibilityFlag(queryScreenReader, "screenReaderChanged");
}

/** iOS "Bold Text": custom fonts cannot follow it, thus the titles go one cut up. */
export function useBoldText(): boolean {
  return useAccessibilityFlag(queryBoldText, "boldTextChanged");
}

/** The system reduce-motion setting (HIG Motion / Android Remove animations). */
export function useReduceMotion(): boolean {
  return useAccessibilityFlag(queryReduceMotion, "reduceMotionChanged");
}
