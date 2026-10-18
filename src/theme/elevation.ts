/* Stíny: teplé a měkké ve světlém režimu; v tmavém nejsou vidět, proto karty
   dostávají hairline (viz Theme.cardBorder) a stín se nekreslí. */
import type { ThemeElevation } from "./types";

export const lightElevation: ThemeElevation = {
  card: {
    shadowColor: "#3C301E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 3,
  },
  raised: {
    shadowColor: "#3C301E",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
};

export const darkElevation: ThemeElevation = {
  card: { elevation: 0 },
  raised: { elevation: 0 },
};
