/* Dates, times and numbers in the active locale (Intl API). The app never builds these strings
   by hand: the catalogs hold the words, Intl holds the formats. Hermes supports the options
   that these helpers use (weekday, day, month, year, hour, minute, percent). */
import { currentLocale } from "./index";
import type { ISODate } from "../model";

/** A local date from "YYYY-MM-DD" at noon, so that a change of daylight time cannot move the day. */
export function dateFromISO(iso: ISODate): Date {
  return new Date(`${iso}T12:00:00`);
}

const capitalize = (text: string): string =>
  text.length ? text.charAt(0).toLocaleUpperCase(currentLocale()) + text.slice(1) : text;

/** "Pondělí 6. října" / "Monday, October 6" — the kicker of the Home screen. */
export function formatDayHeading(date: Date = new Date()): string {
  const text = new Intl.DateTimeFormat(currentLocale(), {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  return capitalize(text);
}

/** "12. 6. 2026" / "6/12/2026". */
export function formatDateNumeric(iso: ISODate): string {
  return new Intl.DateTimeFormat(currentLocale(), {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(dateFromISO(iso));
}

/** "pondělí 6. 10." / "Monday, 10/6" — a day label in the overviews. */
export function formatWeekdayDate(iso: ISODate): string {
  return new Intl.DateTimeFormat(currentLocale(), {
    weekday: "long",
    day: "numeric",
    month: "numeric",
  }).format(dateFromISO(iso));
}

export interface ClockTime {
  hour: number;
  minute: number;
}

/** "19:00" / "7:00 PM". */
export function formatTime({ hour, minute }: ClockTime): string {
  const date = new Date(2000, 0, 1, hour, minute);
  return new Intl.DateTimeFormat(currentLocale(), { hour: "numeric", minute: "2-digit" }).format(
    date,
  );
}

/** The stored "H:MM" time of an entry, shown in the active locale. */
export function formatStoredTime(time: string): string {
  const [h, m] = time.split(":").map((part) => Number.parseInt(part, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  return formatTime({ hour: h, minute: m });
}

/** True when the locale writes the time with 24 hours (the time picker follows it). */
export function uses24Hour(): boolean {
  const cycle = new Intl.DateTimeFormat(currentLocale(), { hour: "numeric" }).resolvedOptions()
    .hourCycle;
  return cycle === "h23" || cycle === "h24";
}

/** Date and time, "12. 6. 2026 19:00" / "Jun 12, 2026, 7:00 PM". */
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat(currentLocale(), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/** "72 %" (cs, with a no-break space) / "72%" (en). The value is 0 to 100. */
export function formatPercent(value: number): string {
  return new Intl.NumberFormat(currentLocale(), {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

/** A plain number in the locale, for example "1 234" / "1,234". */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat(currentLocale()).format(value);
}

/** "a, b a c" / "a, b, and c". Hermes has no Intl.ListFormat, so the fallback joins by hand. */
export function formatList(items: string[], separator: string, last: string): string {
  const ListFormat = (Intl as { ListFormat?: typeof Intl.ListFormat }).ListFormat;
  if (ListFormat) {
    return new ListFormat(currentLocale(), { style: "long", type: "conjunction" }).format(items);
  }
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(separator)}${last}${items[items.length - 1]}`;
}
