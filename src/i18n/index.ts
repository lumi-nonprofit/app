/* Internationalisation (i18n) of the user interface. Every user-facing string comes from the
   message catalogs in src/i18n/locales/<locale>/<namespace>.json. The source locale is cs
   (Czech); en (English) is complete, and CI checks that both stay equal
   (scripts/check-i18n.mjs). The language follows the device. */
import "intl-pluralrules";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import { Platform } from "react-native";
import { NAMESPACES, resources } from "./resources";

export const SUPPORTED_LOCALES = ["cs", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
/** The locale of the source catalog. Every key exists in it. */
export const SOURCE_LOCALE: Locale = "cs";

const isLocale = (value: string | null | undefined): value is Locale =>
  value === "cs" || value === "en";

/** The first device language that the app supports, or the source locale. */
export function detectLocale(): Locale {
  try {
    for (const locale of getLocales()) {
      if (isLocale(locale.languageCode)) return locale.languageCode;
    }
  } catch {
    /* no device information (for example on web without the module) */
  }
  return SOURCE_LOCALE;
}

export interface InitOptions {
  /** A fixed language. Tests use "cs". */
  lng?: Locale;
}

/** Starts i18next once. The resources are bundled, so the texts are ready when init returns. */
export function initI18n(options: InitOptions = {}): typeof i18n {
  if (i18n.isInitialized) {
    if (options.lng && i18n.language !== options.lng) void i18n.changeLanguage(options.lng);
    return i18n;
  }
  const lng = options.lng ?? detectLocale();
  void i18n.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: SOURCE_LOCALE,
    supportedLngs: [...SUPPORTED_LOCALES],
    ns: [...NAMESPACES],
    defaultNS: "common",
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  if (Platform.OS === "web" && typeof document !== "undefined") {
    document.documentElement.lang = lng;
  }
  return i18n;
}

/** The active locale as a BCP 47 tag for the Intl API. */
export function currentLocale(): Locale {
  return isLocale(i18n.language) ? i18n.language : SOURCE_LOCALE;
}

export { useTranslation, Trans } from "react-i18next";
export default i18n;
