export const LOCALES = ["zh", "en", "de"] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_COOKIE = "petderm-lang";

export const LOCALE_LABELS: Record<Locale, string> = {
  zh: "中文",
  en: "EN",
  de: "DE",
};

export const HTML_LANG: Record<Locale, string> = {
  zh: "zh-Hant",
  en: "en",
  de: "de",
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
