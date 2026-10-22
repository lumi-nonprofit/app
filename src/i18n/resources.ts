/* The message catalogs in the bundle. Each namespace is one JSON file per locale. The TypeScript type
   of the cs catalog gives `t()` its typed keys (src/i18n/i18next.d.ts). */
import csCalm from "./locales/cs/calm.json";
import csCheckin from "./locales/cs/checkin.json";
import csCommon from "./locales/cs/common.json";
import csContent from "./locales/cs/content.json";
import csHelp from "./locales/cs/help.json";
import csHome from "./locales/cs/home.json";
import csM1 from "./locales/cs/m1.json";
import csMeasure from "./locales/cs/measure.json";
import csNavigation from "./locales/cs/navigation.json";
import csOnboarding from "./locales/cs/onboarding.json";
import csSettings from "./locales/cs/settings.json";
import csStats from "./locales/cs/stats.json";
import enCalm from "./locales/en/calm.json";
import enCheckin from "./locales/en/checkin.json";
import enCommon from "./locales/en/common.json";
import enContent from "./locales/en/content.json";
import enHelp from "./locales/en/help.json";
import enHome from "./locales/en/home.json";
import enM1 from "./locales/en/m1.json";
import enMeasure from "./locales/en/measure.json";
import enNavigation from "./locales/en/navigation.json";
import enOnboarding from "./locales/en/onboarding.json";
import enSettings from "./locales/en/settings.json";
import enStats from "./locales/en/stats.json";

export const NAMESPACES = [
  "common",
  "navigation",
  "content",
  "onboarding",
  "home",
  "checkin",
  "calm",
  "measure",
  "stats",
  "help",
  "settings",
  "m1",
] as const;

export type Namespace = (typeof NAMESPACES)[number];

export const resources = {
  cs: {
    common: csCommon,
    navigation: csNavigation,
    content: csContent,
    onboarding: csOnboarding,
    home: csHome,
    checkin: csCheckin,
    calm: csCalm,
    measure: csMeasure,
    stats: csStats,
    help: csHelp,
    settings: csSettings,
    m1: csM1,
  },
  en: {
    common: enCommon,
    navigation: enNavigation,
    content: enContent,
    onboarding: enOnboarding,
    home: enHome,
    checkin: enCheckin,
    calm: enCalm,
    measure: enMeasure,
    stats: enStats,
    help: enHelp,
    settings: enSettings,
    m1: enM1,
  },
} as const;

/** The shape of the source catalog; `t()` accepts only its keys. */
export type SourceResources = (typeof resources)["cs"];
