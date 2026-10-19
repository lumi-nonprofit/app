/* Text for data that the code addresses by id: moods, words, tags, help lines, activities,
   instruments and result bands. The keys are templates over the ids, so the extractor
   (i18next-cli) cannot see them; i18next.config.ts preserves the `content` namespace, and
   test/i18n.test.ts checks that every id has its text. TypeScript checks the template keys
   against the catalog. */
import type { TOptions } from "i18next";
import i18n from "./index";
import type { SourceResources } from "./resources";

type Leaves<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

/** Every leaf key of the `content` namespace. */
export type ContentKey = Leaves<SourceResources["content"]>;

/* The typed `t` of i18next brands its keys; the template over the ids is already typed by
   `ContentKey`, so the call goes through the plain signature. */
const translate = i18n.t as unknown as (key: string, options?: TOptions) => string;

/** Reads one text of the `content` namespace in the active language. */
export function contentText(key: ContentKey, options?: TOptions): string {
  return translate(`content:${key}`, options);
}

/** Reads a text that can be absent, for example the label of a custom tag. */
export function contentTextOrNull(key: string, options?: TOptions): string | null {
  const full = `content:${key}`;
  return i18n.exists(full) ? translate(full, options) : null;
}
