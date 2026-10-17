/* Guard neuložených změn (HIG Modality/Alerts: varovat při nečekané ztrátě
   rozpracovaného obsahu; action sheet na iOS, dialog na Androidu).
   Staví na usePreventRemove: zachytí systémové Zpět, swipe-down sheetu,
   hardware Back i router.back()/dismiss(). Programové odchody po uložení
   jdou přes `leave()`, které další odchod propustí bez dotazu. */
import React from "react";
import { useNavigation } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import type { NavigationAction } from "expo-router/react-navigation";
import { confirmDiscard } from "./dialogs";

interface Options {
  /** Jsou rozpracované změny, které by odchod zahodil? */
  dirty: boolean;
  /** Titulek popisuje situaci („Zahodit rozepsaný zápis?“). */
  title: string;
  message?: string;
  /** Sloveso potvrzení; výchozí „Zahodit“. */
  confirmLabel?: string;
  /** Akce, které rozpracovanou práci nezahazují (např. Zpět na předchozí krok
      uvnitř sheetu) — projdou bez dotazu. Výchozí: každé odstranění se ptá. */
  allow?: (action: NavigationAction) => boolean;
}

export function useDiscardGuard({ dirty, title, message, confirmLabel, allow }: Options): {
  /** Odchod bez dotazu (po uložení): nastaví výjimku a zavolá navigaci. */
  leave: (go: () => void) => void;
} {
  const navigation = useNavigation();
  const bypass = React.useRef(false);

  usePreventRemove(dirty, ({ data }) => {
    if (bypass.current || allow?.(data.action)) {
      bypass.current = false;
      navigation.dispatch(data.action);
      return;
    }
    confirmDiscard({ title, message, confirmLabel })
      .then((ok) => {
        if (ok) navigation.dispatch(data.action);
      })
      .catch(() => {});
  });

  const leave = React.useCallback((go: () => void) => {
    bypass.current = true;
    go();
    /* když navigace nic neodstranila (např. nebylo kam), výjimka nesmí zůstat viset */
    setTimeout(() => {
      bypass.current = false;
    }, 1000);
  }, []);

  return { leave };
}
