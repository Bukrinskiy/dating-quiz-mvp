import type { AppLocale } from "./types";

export const DEFAULT_LOCALE: AppLocale = "en";
export const SUPPORTED_LOCALES = ["en", "ru", "fr", "es"] as const satisfies readonly AppLocale[];

export const languageLabels: Record<AppLocale, string> = {
  en: "English",
  ru: "Русский",
  fr: "Français",
  es: "Español",
};

export function normalizeAppLocale(locale: string | null | undefined): AppLocale {
  const normalized = locale?.trim().toLowerCase();
  if (!normalized) {
    return DEFAULT_LOCALE;
  }
  if (normalized.startsWith("ru")) {
    return "ru";
  }
  if (normalized.startsWith("fr")) {
    return "fr";
  }
  if (normalized.startsWith("es")) {
    return "es";
  }
  return DEFAULT_LOCALE;
}
