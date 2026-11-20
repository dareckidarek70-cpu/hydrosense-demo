import { messages } from "./messages.ts";

export const locales = ["pl", "en"] as const;
export const LOCALE_COOKIE = "hydrosense_locale";
export const DEFAULT_LOCALE = "pl";
export type Locale = typeof locales[number];
export type MessageKey = keyof typeof messages;
type Values = Record<string, string | number>;

export function resolveLocale(value: unknown): Locale {
  return locales.includes(value as Locale) ? value as Locale : DEFAULT_LOCALE;
}

export function localization(locale: Locale) {
  const tag = locale === "pl" ? "pl-PL" : "en-GB";
  const smallDate = new Intl.DateTimeFormat(tag, { timeZone: "UTC", dateStyle: "short" });
  const fullDate = new Intl.DateTimeFormat(tag, { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" });
  const percentage = new Intl.NumberFormat(tag, { style: "percent", maximumFractionDigits: 0 });
  const t = (key: MessageKey, values: Values = {}) =>
    messages[key][locale].replace(/\{(\w+)\}/g, (token, name: string) => String(values[name] ?? token));
  const num = (value: number, digits = 0, signed = false) => {
    const rounded = Number(value.toFixed(digits));
    return new Intl.NumberFormat(tag, {
      minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: false,
      signDisplay: signed ? "exceptZero" : "auto",
    }).format(rounded === 0 ? 0 : rounded);
  };
  const date = (value: string | number) => smallDate.format(new Date(value));
  return {
    locale, t, num, date,
    dateTime: (value: string | number) => fullDate.format(new Date(value)),
    percent: (value: number | null) => value === null ? t("unavailable") : percentage.format(value),
    coordinates: ([lat, lng]: readonly [number, number]) => `${num(lat, 5)} / ${num(lng, 5)}`,
  };
}
