import { useMemo } from "react";
import type { PropsWithChildren } from "react";

import { normalizeAppLocale } from "./locale";
import { messagesByLocale, modeMessagesByLocale, roleLabelsByLocale } from "./messages";
import { I18nContext } from "./context";
import type { I18nContextValue } from "./context";

type I18nProviderProps = PropsWithChildren<{
  locale?: string | null;
}>;

export function I18nProvider({ children, locale }: I18nProviderProps) {
  const normalizedLocale = normalizeAppLocale(locale);
  const value = useMemo<I18nContextValue>(
    () => ({
      locale: normalizedLocale,
      messages: messagesByLocale[normalizedLocale],
      modeMessages: modeMessagesByLocale[normalizedLocale],
      roleLabels: roleLabelsByLocale[normalizedLocale],
    }),
    [normalizedLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
