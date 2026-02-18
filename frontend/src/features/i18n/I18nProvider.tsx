import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from "react";
import { messages, type AppMessages, type Locale } from "./messages";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  copy: AppMessages;
};

const LOCALE_STORAGE_KEY = "app_locale";

const I18nContext = createContext<I18nContextValue | null>(null);

const detectBrowserLocale = (): Locale => {
  const browserLocale = window.navigator.languages?.[0] ?? window.navigator.language ?? "";
  return browserLocale.toLowerCase().startsWith("en") ? "en" : "ru";
};

const getInitialLocale = (): Locale => {
  const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved === "en" || saved === "ru") {
    return saved;
  }

  return detectBrowserLocale();
};

export const I18nProvider = ({ children }: PropsWithChildren) => {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
  }, []);

  const value = useMemo(
    () => ({ locale, setLocale, copy: messages[locale] }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextValue => {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return value;
};
