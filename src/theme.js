/* Lumi — design tokeny pro React Native.
   Hodnoty převzaté 1:1 z Lumi design systemu (dřív src/styles/tokens/*.css);
   CSS proměnné nahrazují JS konstanty, em/unitless hodnoty převádějí helpery
   `leading`/`tracking` na absolutní body. */

/* --- barvy: cream / ink / sun / sage / lake / lilac / clay --- */
export const palette = {
  cream0: "#FFFEFB",
  cream50: "#FBF7EF",
  cream100: "#F5EDDF",
  cream200: "#EADDC6",
  cream300: "#D9C6A6",

  ink900: "#2B2722",
  ink800: "#3A342C",
  ink700: "#544C41",
  ink500: "#7A7060",
  ink400: "#998E7C",

  sun100: "#FCEFD3",
  sun200: "#F8DEA4",
  sun300: "#F2C76C",
  sun400: "#E8AC43",
  sun500: "#D89426",
  sun600: "#B4761A",
  sun700: "#8C5A12",

  sage100: "#E7EEDD",
  sage300: "#B5C9A2",
  sage500: "#7E9A6B",
  sage700: "#55704A",

  lake100: "#E3EAF2",
  lake300: "#A8BDD3",
  lake500: "#6E8DAD",
  lake700: "#48617C",

  lilac100: "#ECE8F5",
  lilac300: "#C3B8DF",
  lilac500: "#9483BE",
  lilac700: "#675693",

  clay100: "#F7E2DA",
  clay300: "#E2A893",
  clay500: "#C26F52",
  clay700: "#94492F",
};

/* --- sémantické barvy --- */
export const colors = {
  surfacePage: palette.cream50,
  surfaceCard: "#FFFFFF",
  surfaceSunken: palette.cream100,
  surfaceInk: palette.ink900,

  textStrong: palette.ink900,
  textBody: palette.ink800,
  textMuted: palette.ink500,
  textFaint: palette.ink400,
  textOnInk: "#FFF8EC",
  textOnAccent: "#FFFFFF",

  accent: palette.sun500,
  accentStrong: palette.sun600,
  accentSoft: palette.sun100,
  positive: palette.sage500,
  positiveSoft: palette.sage100,
  info: palette.lake500,
  infoSoft: palette.lake100,
  danger: palette.clay700,
  dangerSoft: palette.clay100,

  borderSubtle: "rgba(74, 62, 42, 0.10)",
  borderStrong: "rgba(74, 62, 42, 0.18)",
  focusRing: "rgba(216, 148, 38, 0.35)",
};

/* --- spacing (4px grid), rádiusy --- */
export const space = { s1: 4, s2: 8, s3: 12, s4: 16, s5: 20, s6: 24, s8: 32, s10: 40, s12: 48, s16: 64 };
export const radius = { xs: 8, sm: 12, md: 16, lg: 22, xl: 28, pill: 999 };

/* --- typografie --- */
export const type = { xs: 12, sm: 13, base: 15, md: 17, lg: 20, xl: 24, xxl: 30, xxxl: 38 };

/* RN nepřepíná řezy přes fontWeight u staticky nahraných fontů — váhu vybírá
   fontFamily. Nikde nepoužívej fontWeight; vždy font.display(w) / font.body(w). */
const DISPLAY_FAMILIES = {
  400: "BricolageGrotesque_400Regular",
  500: "BricolageGrotesque_500Medium",
  600: "BricolageGrotesque_600SemiBold",
  700: "BricolageGrotesque_700Bold",
};
const BODY_FAMILIES = {
  400: "InstrumentSans_400Regular",
  500: "InstrumentSans_500Medium",
  600: "InstrumentSans_600SemiBold",
  700: "InstrumentSans_700Bold",
};
export const font = {
  display: (weight = 400) => ({ fontFamily: DISPLAY_FAMILIES[weight] || DISPLAY_FAMILIES[400] }),
  body: (weight = 400) => ({ fontFamily: BODY_FAMILIES[weight] || BODY_FAMILIES[400] }),
};

/* unitless line-height / em tracking → absolutní body podle velikosti písma */
export const leading = {
  tight: (size) => Math.round(size * 1.15),
  snug: (size) => Math.round(size * 1.3),
  body: (size) => Math.round(size * 1.55),
};
export const tracking = {
  display: (size) => -0.02 * size,
  label: (size) => 0.06 * size,
};

/* výchozí text — náhrada dědičnosti z `body` v CSS (RN Text nedědí) */
export const text = {
  base: { ...font.body(400), fontSize: type.base, lineHeight: leading.body(type.base), color: colors.textBody },
};

/* --- stíny: teplé, měkké; elevation pro Android --- */
export const shadow = {
  card: { shadowColor: "#3C301E", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 20, elevation: 3 },
  raised: { shadowColor: "#3C301E", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 8 },
  /* zlatý glow ring (v CSS spread 6px) — v RN aproximace nulovým offsetem */
  glow: { shadowColor: palette.sun400, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 7, elevation: 4 },
};

/* --- motion --- */
export const dur = { fast: 150, base: 240, slow: 420, breath: 4000 };
