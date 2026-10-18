// Configuration of i18next-cli (https://github.com/i18next/i18next-cli).
// `npm run i18n:extract` writes the keys that the code uses into the catalogs.
// `npm run i18n:check` fails when a catalog is out of date, a translation is missing, or the
// catalogs differ (scripts/check-i18n.mjs).
import { defineConfig } from "i18next-cli";

export default defineConfig({
  locales: ["cs", "en"],
  extract: {
    input: ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"],
    ignore: ["src/i18n/**", "**/*.test.*", "**/*.d.ts"],
    output: "src/i18n/locales/{{language}}/{{namespace}}.json",
    functions: ["t", "*.t"],
    transComponents: ["Trans"],
    defaultNS: "common",
    keySeparator: ".",
    nsSeparator: ":",
    contextSeparator: "_",
    pluralSeparator: "_",
    defaultValue: "",
    // The `content` namespace holds id-keyed text (moods, words, instruments). The code reads it
    // through `contentText()` with template keys, so the extractor cannot see those keys.
    // scripts/check-i18n.mjs and test/i18n.test.ts check that namespace instead.
    preservePatterns: ["content:*", "*._meta*", "*._meta.*"],
    removeUnusedKeys: true,
    preserveContextVariants: true,
    sort: true,
    indentation: 2,
    primaryLanguage: "cs",
    secondaryLanguages: ["en"],
  },
});
