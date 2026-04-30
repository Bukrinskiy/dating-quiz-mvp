import { createContext, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { useLocation } from "react-router-dom";
import { messages, type AppMessages } from "./messages";
import type { Locale } from "../../entities/locale/model/types";

export type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  copy: AppMessages;
};

const LOCALE_STORAGE_KEY = "app_locale";
const DEFAULT_LOCALE: Locale = "en";

const I18nContext = createContext<I18nContextValue | null>(null);

const detectBrowserLocale = (): Locale => DEFAULT_LOCALE;

const getInitialLocale = (): Locale => {
  const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved === "en") {
    return saved;
  }

  return detectBrowserLocale();
};

export const I18nProvider = ({ children }: PropsWithChildren) => {
  const location = useLocation();
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
  }, []);

  useEffect(() => {
    const pathLocale = location.pathname.match(/^\/(ru|en)(\/|$)/)?.[1] as Locale | undefined;
    if (!pathLocale) return;
    if (pathLocale === "en" && pathLocale === locale) return;
    setLocaleState(DEFAULT_LOCALE);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, DEFAULT_LOCALE);
  }, [locale, location.pathname]);

const value = useMemo(
    () => ({ locale, setLocale, copy: messages[locale] }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};
export { I18nContext };
