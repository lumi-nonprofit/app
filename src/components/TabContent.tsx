/* Content inside the native tabs. The navigator handles the bottom safe area and the height of
   the tab bar (iOS content insets, Android bottom navigation and safe area). Screen thus leaves
   out insets.bottom there. Outside the tabs (modals) Screen handles the bottom area itself. */
import React from "react";

export const TabContentContext = React.createContext(false);

export function useInsideTabs(): boolean {
  return React.useContext(TabContentContext);
}
