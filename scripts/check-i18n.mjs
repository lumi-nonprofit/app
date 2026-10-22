// Checks the message catalogs in src/i18n/locales:
//   - every locale has the same namespace files and the same keys (the `_meta` blocks are
//     documentation and can differ);
//   - no value is empty;
//   - plural forms are complete for the locale (cs: one, few, many, other; en: one, other);
//   - the {{placeholders}} of a key are the same in every locale;
//   - the English catalog has no Czech text, except the proper nouns in the allowlist.
// Exit code 1 lists every finding.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../src/i18n/locales/", import.meta.url).pathname;
const SOURCE = "cs";
const PLURALS = {
  cs: ["one", "few", "many", "other"],
  en: ["one", "other"],
};
const CZECH = /[ěščřžýáíéúůťďňĚŠČŘŽÝÁÍÉÚŮŤĎŇ]/;
const ALLOWED_IN_EN = [
  "Linka bezpečí",
  "Linka první psychické pomoci",
  "Linka pomoci obětem",
  "Rodičovská linka",
  "Česká asociace pracovišť linek důvěry",
  "ČAPLD",
  "Lumi",
];

const findings = [];

function flatten(value, prefix, out) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else {
    out.set(prefix, value);
  }
  return out;
}

const locales = readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();
if (!locales.includes(SOURCE)) {
  console.error(`The source locale "${SOURCE}" is missing in ${ROOT}.`);
  process.exit(1);
}

const catalogs = new Map();
for (const locale of locales) {
  const files = readdirSync(join(ROOT, locale))
    .filter((f) => f.endsWith(".json"))
    .sort();
  const byNamespace = new Map();
  for (const file of files) {
    const json = JSON.parse(readFileSync(join(ROOT, locale, file), "utf8"));
    byNamespace.set(file.replace(/\.json$/, ""), flatten(json, "", new Map()));
  }
  catalogs.set(locale, byNamespace);
}

const isMeta = (key) => key.split(".").includes("_meta");
// Plural forms differ by locale (cs: one, few, many, other; en: one, other): the comparison of
// the locales uses the base key, and the check of the plural forms runs per locale below.
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const baseKey = (key) => key.replace(PLURAL_SUFFIX, "");
const baseKeys = (keys) => new Set([...keys.keys()].filter((k) => !isMeta(k)).map(baseKey));
const placeholders = (text) =>
  [...String(text).matchAll(/\{\{\s*([\w.]+)\s*(?:,[^}]*)?\}\}/g)]
    .map((m) => m[1])
    .sort()
    .join(",");

const source = catalogs.get(SOURCE);
for (const locale of locales) {
  const catalog = catalogs.get(locale);
  for (const ns of source.keys()) {
    if (!catalog.has(ns)) findings.push(`${locale}: namespace file ${ns}.json is missing`);
  }
  for (const ns of catalog.keys()) {
    if (!source.has(ns))
      findings.push(`${locale}: namespace file ${ns}.json has no ${SOURCE} counterpart`);
  }
  for (const [ns, keys] of catalog) {
    const sourceKeys = source.get(ns) ?? new Map();
    const sourceBases = baseKeys(sourceKeys);
    const sourcePlaceholders = new Map();
    for (const [key, value] of sourceKeys) {
      sourcePlaceholders.set(baseKey(key), placeholders(value));
    }
    for (const [key, value] of keys) {
      if (typeof value !== "string" || value.trim() === "") {
        if (!isMeta(key)) findings.push(`${locale}/${ns}: "${key}" is empty`);
      } else if (value !== value.trim() && !key.startsWith("list.")) {
        // The `list` keys are separators and keep their spaces on purpose.
        findings.push(`${locale}/${ns}: "${key}" has spaces at the start or the end`);
      }
      if (isMeta(key)) continue;
      if (locale !== SOURCE && !sourceBases.has(baseKey(key))) {
        findings.push(`${locale}/${ns}: "${key}" does not exist in ${SOURCE}`);
      }
      if (locale !== SOURCE && sourcePlaceholders.has(baseKey(key))) {
        const a = sourcePlaceholders.get(baseKey(key));
        const b = placeholders(value);
        if (a !== b)
          findings.push(
            `${locale}/${ns}: "${key}" placeholders {${b}} differ from ${SOURCE} {${a}}`,
          );
      }
      if (
        locale === "en" &&
        CZECH.test(ALLOWED_IN_EN.reduce((t, w) => t.split(w).join(""), String(value)))
      ) {
        findings.push(`en/${ns}: "${key}" contains Czech text`);
      }
    }
    if (locale !== SOURCE) {
      const bases = baseKeys(keys);
      for (const base of sourceBases) {
        if (!bases.has(base)) findings.push(`${locale}/${ns}: "${base}" is missing`);
      }
    }
    // Plural forms: a key with one plural suffix needs every form of the locale.
    const forms = PLURALS[locale];
    if (forms) {
      const bases = new Map();
      for (const key of keys.keys()) {
        const m = key.match(/^(.*)_(zero|one|two|few|many|other)$/);
        if (m) {
          if (!bases.has(m[1])) bases.set(m[1], new Set());
          bases.get(m[1]).add(m[2]);
        }
      }
      for (const [base, present] of bases) {
        for (const form of forms) {
          if (!present.has(form))
            findings.push(`${locale}/${ns}: "${base}" lacks the plural form "${form}"`);
        }
      }
    }
  }
}

if (findings.length > 0) {
  console.error(findings.join("\n"));
  console.error(`\n${findings.length} finding(s) in the message catalogs.`);
  process.exit(1);
}
console.log(
  `Catalogs are complete: ${locales.join(", ")} (${[...source.keys()].length} namespaces).`,
);
