/* The guard of unsaved changes (HIG Modality/Alerts: warn before an unexpected loss of
   work in progress; an action sheet on iOS, a dialog on Android).
   It builds on `usePreventRemove`: it catches the system Back, the swipe-down of a sheet,
   the hardware Back and router.back()/dismiss(). Programmatic exits after a save go
   through `leave()`, which lets the next exit pass without a question. */
import React from "react";
import { usePreventRemove } from "expo-router/react-navigation";
import { confirmDiscard } from "./dialogs";

interface Options {
  /** Are there changes in progress that an exit would discard? */
  dirty: boolean;
  /** The title describes the situation ("Zahodit rozepsaný zápis?"). */
  title: string;
  message?: string;
  /** The verb of the confirmation; the default is "Zahodit". */
  confirmLabel?: string;
}

export function useDiscardGuard({ dirty, title, message, confirmLabel }: Options): {
  /** An exit without a question (after a save): sets the exception and calls the navigation. */
  leave: (go: () => void) => void;
} {
  const bypass = React.useRef(false);

  /* expo-router 58: `repeat` turns the guard off and sends the blocked action again. A plain
     `dispatch` of the action meets the active guard again, which gives an endless loop. */
  usePreventRemove(dirty, ({ repeat }) => {
    if (bypass.current) {
      bypass.current = false;
      repeat();
      return;
    }
    confirmDiscard({ title, message, confirmLabel })
      .then((ok) => {
        if (ok) repeat();
      })
      .catch(() => {});
  });

  const leave = React.useCallback((go: () => void) => {
    bypass.current = true;
    go();
    /* when the navigation removed nothing (for example, nowhere to go), the exception must go */
    setTimeout(() => {
      bypass.current = false;
    }, 1000);
  }, []);

  return { leave };
}
