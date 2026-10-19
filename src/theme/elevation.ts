/* Shadows: warm and soft in the light mode; in the dark mode they are not visible, thus the
   cards get a hairline (see Theme.cardBorder) and no shadow. */
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
