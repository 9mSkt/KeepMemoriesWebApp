import en from "./en.json";
import th from "./th.json";

export type Locale = "en" | "th";
export type MessageKey = keyof typeof en;

export const LOCALES: Locale[] = ["en", "th"];
export const LOCALE_COOKIE = "km-locale";
export const LOCALE_STORAGE_KEY = "km-locale";

const dictionaries: Record<Locale, Record<MessageKey, string>> = { en, th };

export function isLocale(v: unknown): v is Locale {
  return v === "en" || v === "th";
}

export function translate(locale: Locale, key: MessageKey, vars?: Record<string, string | number>): string {
  const template = dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}
