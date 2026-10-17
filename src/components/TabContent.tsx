/* Obsah uvnitř nativních tabů: spodní bezpečnou zónu a výšku tab baru řeší
   navigátor (iOS content insets, Android bottom nav + safe area), Screen tedy
   nepřidává insets.bottom. Mimo taby (modaly) si spodní zónu hlídá sám. */
import React from "react";

export const TabContentContext = React.createContext(false);

export function useInsideTabs(): boolean {
  return React.useContext(TabContentContext);
}
