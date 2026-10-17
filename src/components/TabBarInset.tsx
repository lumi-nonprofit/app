/* Rezerva pod vlastní plovoucí tab bar (fáze 5 ho nahradí nativním tab barem
   a tenhle kontext zmizí). Obrazovky v tabech čtou hodnotu přes Screen. */
import React from "react";

export const TAB_BAR_RESERVE = 110;

export const TabBarInsetContext = React.createContext(0);

export function useTabBarInset(): number {
  return React.useContext(TabBarInsetContext);
}
